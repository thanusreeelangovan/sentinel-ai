import uuid


def test_block_and_unblock_receiver(client):
    sender_id = f"USR_BLOCK_{uuid.uuid4().hex[:10]}"
    receiver_id = f"receiver.{uuid.uuid4().hex[:8]}@upi"

    create = client.post(
        "/blocked-receivers",
        json={
            "sender_id": sender_id,
            "receiver_id": receiver_id,
            "receiver_name": "Suspicious Receiver",
        },
    )
    assert create.status_code == 201
    body = create.json()
    assert body["sender_id"] == sender_id
    assert body["receiver_id"] == receiver_id

    duplicate = client.post(
        "/blocked-receivers",
        json={
            "sender_id": sender_id,
            "receiver_id": receiver_id,
            "receiver_name": "Suspicious Receiver",
        },
    )
    assert duplicate.status_code == 201
    assert duplicate.json()["receiver_id"] == receiver_id

    listing = client.get("/blocked-receivers", params={"sender_id": sender_id})
    assert listing.status_code == 200
    assert [item["receiver_id"] for item in listing.json()] == [receiver_id]

    removed = client.delete(
        f"/blocked-receivers/{receiver_id}",
        params={"sender_id": sender_id},
    )
    assert removed.status_code == 204

    listing_after = client.get("/blocked-receivers", params={"sender_id": sender_id})
    assert listing_after.status_code == 200
    assert listing_after.json() == []
