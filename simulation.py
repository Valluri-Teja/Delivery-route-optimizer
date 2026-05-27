import asyncio
from models import AgentStatus, OrderStatus
from dispatcher import agents, orders, G, find_nearest_agent
from datetime import datetime

connected_clients = set()

async def broadcast(message):
    if connected_clients:
        disconnected = set()
        for client in connected_clients:
            try:
                await client.send_json(message)
            except:
                disconnected.add(client)
        connected_clients.difference_update(disconnected)

async def move_agents():
    tick = 0
    while True:
        for agent in agents.values():
            if agent.status in [AgentStatus.MOVING_TO_PICKUP, AgentStatus.DELIVERING]:
                if agent.route and agent.route_index < len(agent.route) - 1:
                    agent.route_index += 1
                    agent.current_location = agent.route[agent.route_index]
                    order = orders.get(agent.current_order_id)
                    if order and agent.current_location == order.pickup_location:
                        agent.status = AgentStatus.DELIVERING
                        order.status = OrderStatus.PICKED_UP
                    elif order and agent.current_location == order.delivery_location:
                        agent.status = AgentStatus.IDLE
                        agent.current_order_id = None
                        agent.route = []
                        agent.route_index = 0
                        agent.total_deliveries += 1
                        if order.id in agent.order_batch:
                            agent.order_batch.remove(order.id)
                        order.status = OrderStatus.DELIVERED
                        order.delivered_at = datetime.now().isoformat()
                    await broadcast({
                        "type": "agent_update",
                        "agent": agent.to_dict(),
                        "order": order.to_dict() if order else None
                    })

        from chennai_dispatcher import move_chennai_agents_step
        chennai_updates = move_chennai_agents_step()
        for update in chennai_updates:
            await broadcast({
                "type": "chennai_agent_update",
                "agent": update["agent"],
                "lat": update["lat"],
                "lng": update["lng"],
                "order": update["order"]
            })

        tick += 1
        await asyncio.sleep(2)