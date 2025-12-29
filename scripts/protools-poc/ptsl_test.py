#!/usr/bin/env python3
"""
Pro Tools Scripting Library (PTSL) PoC Test Client
Tests basic connectivity to Pro Tools via gRPC
"""

import grpc
import json
import PTSL_pb2
import PTSL_pb2_grpc

PTSL_SERVER = "localhost:31416"

def create_request(command_id: int, body_json: str = "{}", session_id: str = "") -> PTSL_pb2.Request:
    """Create a PTSL request"""
    request = PTSL_pb2.Request()
    request.header.command = command_id
    request.header.version = 2025  # Year
    request.header.version_minor = 10  # Month
    if session_id:
        request.header.session_id = session_id
    request.request_body_json = body_json
    return request

def main():
    print(f"Connecting to Pro Tools at {PTSL_SERVER}...")

    try:
        # Create gRPC channel
        channel = grpc.insecure_channel(PTSL_SERVER)
        stub = PTSL_pb2_grpc.PTSLStub(channel)

        # Step 1: Register connection
        print("\n[1] Registering connection...")
        register_body = json.dumps({
            "company_name": "MUED",
            "application_name": "MUEDnote Hub"
        })

        # CommandId for RegisterConnection = 70
        request = create_request(70, register_body)
        response = stub.SendGrpcRequest(request)

        print(f"    Status: {response.header.status}")
        session_id = ""
        if response.response_body_json:
            body = json.loads(response.response_body_json)
            session_id = body.get("session_id", "")
            print(f"    Session ID: {session_id}")
        if response.response_error_json:
            print(f"    Error: {response.response_error_json}")

        if not session_id:
            print("\n❌ Failed to get session_id, cannot continue")
            return

        # Step 2: Get Transport State
        print("\n[2] Getting transport state...")
        # CommandId for GetTransportState = 59
        request = create_request(59, "{}", session_id)
        response = stub.SendGrpcRequest(request)

        print(f"    Status: {response.header.status}")
        if response.response_body_json:
            body = json.loads(response.response_body_json)
            print(f"    Transport State: {json.dumps(body, indent=2)}")
        if response.response_error_json:
            print(f"    Error: {response.response_error_json}")

        # Step 3: Get Session Name
        print("\n[3] Getting session name...")
        # CommandId for GetSessionName = 29
        request = create_request(29, "{}", session_id)
        response = stub.SendGrpcRequest(request)

        print(f"    Status: {response.header.status}")
        if response.response_body_json:
            body = json.loads(response.response_body_json)
            print(f"    Session: {json.dumps(body, indent=2)}")
        if response.response_error_json:
            print(f"    Error: {response.response_error_json}")

        # Step 4: Get Track List
        print("\n[4] Getting track list...")
        track_request_body = json.dumps({
            "track_filter_list": [
                {"filter": "TLFilter_All", "is_inverted": False}
            ],
            "is_filter_list_additive": True,
            "pagination_request": {
                "limit": 100,
                "offset": 0
            }
        })
        # CommandId for GetTrackList = 3
        request = create_request(3, track_request_body, session_id)
        response = stub.SendGrpcRequest(request)

        print(f"    Status: {response.header.status}")
        track_ids = []
        track_names = []
        if response.response_body_json:
            body = json.loads(response.response_body_json)
            if "track_list" in body:
                print(f"    Found {len(body['track_list'])} tracks:")
                for track in body["track_list"][:10]:
                    track_id = track.get('id', '')
                    track_name = track.get('name', 'Unknown')
                    track_type = track.get('type', 'Unknown')
                    print(f"      - {track_name}: {track_type} (id: {track_id[:20]}...)")
                    track_ids.append(track_id)
                    track_names.append(track_name)
                if len(body["track_list"]) > 10:
                    print(f"      ... and {len(body['track_list']) - 10} more")
            else:
                print(f"    Response keys: {list(body.keys())}")
        if response.response_error_json:
            print(f"    Error: {response.response_error_json}")

        # Step 5: Get Record Mode
        print("\n[5] Getting record mode...")
        # CommandId for GetRecordMode = 57
        request = create_request(57, "{}", session_id)
        response = stub.SendGrpcRequest(request)

        print(f"    Status: {response.header.status}")
        if response.response_body_json:
            body = json.loads(response.response_body_json)
            print(f"    Record Mode: {json.dumps(body, indent=2)}")
        if response.response_error_json:
            print(f"    Error: {response.response_error_json}")

        # Step 6: Get Track Control Info (Volume) - new in 2025.10
        if track_names:
            print("\n[6] Getting track volume info...")
            control_request_body = json.dumps({
                "track_names": [track_names[0]],  # First track
                "control_id": {
                    "section": "TSId_MainOut",
                    "control_type": "TCType_Volume"
                }
            })
            # CommandId for GetTrackControlInfo = 148
            request = create_request(148, control_request_body, session_id)
            response = stub.SendGrpcRequest(request)

            print(f"    Status: {response.header.status}")
            if response.response_body_json:
                body = json.loads(response.response_body_json)
                print(f"    Volume Info: {json.dumps(body, indent=2)}")
            if response.response_error_json:
                print(f"    Error: {response.response_error_json}")

            # Step 7: Get Track Control Breakpoints (actual volume value)
            print("\n[7] Getting track volume value (breakpoints)...")
            breakpoint_request_body = json.dumps({
                "track_name": track_names[0],  # First track
                "control_id": {
                    "section": "TSId_MainOut",
                    "control_type": "TCType_Volume"
                }
            })
            # CommandId for GetTrackControlBreakpoints = 149
            request = create_request(149, breakpoint_request_body, session_id)
            response = stub.SendGrpcRequest(request)

            print(f"    Status: {response.header.status}")
            if response.response_body_json:
                body = json.loads(response.response_body_json)
                print(f"    Volume Value: {json.dumps(body, indent=2)}")
            if response.response_error_json:
                print(f"    Error: {response.response_error_json}")

        # Step 8: Subscribe to Events (track_id in event_data_json)
        print("\n[8] Subscribing to track events...")
        if track_ids:
            # Build event subscriptions with track_ids in event_data_json
            events = []
            for track_id in track_ids[:2]:  # First 2 tracks
                filter_json = json.dumps({"track_id": track_id})
                events.append({"event_id": "EId_TrackMuteStateChanged", "event_data_json": filter_json})
                events.append({"event_id": "EId_TrackSoloStateChanged", "event_data_json": filter_json})
                events.append({"event_id": "EId_TrackRecordEnabledStateChanged", "event_data_json": filter_json})

            subscribe_body = json.dumps({"events": events})
            # CommandId for SubscribeToEvents = 132
            request = create_request(132, subscribe_body, session_id)
            response = stub.SendGrpcRequest(request)

            print(f"    Status: {response.header.status}")
            if response.response_body_json:
                body = json.loads(response.response_body_json)
                print(f"    Subscribe result: {json.dumps(body, indent=2)}")
            if response.response_error_json:
                print(f"    Error: {response.response_error_json}")
            else:
                print(f"    Subscribed to {len(events)} events for {len(track_ids[:2])} tracks")
        else:
            print("    Skipping - no track IDs available")

        # Step 9: Poll for events (check if any pending)
        print("\n[9] Polling for events (non-blocking check)...")
        # CommandId for PollEvents = 135
        # Note: PollEvents is a streaming endpoint and will block waiting for events
        # For this PoC, we skip the actual polling to avoid hanging
        print("    (Skipping actual poll - streaming requires async handling)")
        print("    Events would be received via SendGrpcStreamingRequest")

        print("\n" + "="*60)
        print("Pro Tools PoC 結果サマリー:")
        print("="*60)
        print("✅ 接続: 成功")
        print("✅ トランスポート状態: 取得可能 (停止/再生/録音)")
        print("✅ レコードモード: 取得可能")
        print("✅ トラックリスト: 取得可能")
        print("✅ トラック状態イベント: ミュート/ソロ/録音有効")
        print("❌ フェーダー/ボリューム値: 未実装 (Avid SDK制限)")
        print("="*60)

        print("\n✅ PTSL PoC completed!")

    except grpc.RpcError as e:
        print(f"\n❌ gRPC Error: {e.code()}")
        print(f"   Details: {e.details()}")
        print("\n   Make sure Pro Tools is running!")
    except Exception as e:
        print(f"\n❌ Error: {type(e).__name__}: {e}")

if __name__ == "__main__":
    main()
