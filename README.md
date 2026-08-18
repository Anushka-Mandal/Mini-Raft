# Mini-Raft — Collaborative Drawing Board

Mini-Raft is a real-time collaborative drawing application built with WebSockets and a custom implementation of the Raft consensus algorithm.

Multiple users can draw simultaneously on a shared canvas. Drawing operations are sent through a gateway to a Raft leader, replicated across follower replicas, and committed after receiving acknowledgement from a majority of the cluster.

The project demonstrates how distributed consensus and replication can be applied to a real-time collaborative application.

## Architecture

```text
                         Browser
                            |
                        WebSocket
                            |
                            v
                    +---------------+
                    |    Gateway    |
                    |   Port 3000   |
                    +-------+-------+
                            |
                            v
                    +---------------+
                    |  Raft Leader  |
                    +-------+-------+
                            |
                 +----------+----------+
                 |                     |
                 v                     v
          +-------------+       +-------------+
          |   Replica   |       |   Replica   |
          |  Follower 1 |       |  Follower 2 |
          +-------------+       +-------------+
```

The system consists of a WebSocket gateway and a cluster of three Raft replicas.

### Gateway

The gateway acts as the entry point for browser clients.

It is responsible for:

* Accepting WebSocket connections
* Receiving drawing operations from clients
* Forwarding operations to the current Raft leader
* Broadcasting committed drawing operations to connected clients
* Tracking connected users

### Raft Replicas

The system uses three replica servers.

At any given time:

* One replica acts as the leader
* The remaining replicas act as followers
* The leader receives drawing operations
* The leader replicates operations to followers
* An operation is committed after a majority acknowledgement
* Followers receive heartbeats from the leader

If the leader fails, the remaining replicas can elect a new leader.

## Features

* Real-time collaborative drawing
* WebSocket-based communication
* Pen tool
* Eraser tool
* Line tool
* Rectangle tool
* Circle tool
* Color selection
* Stroke width control
* Opacity control
* Live connected-user count
* Canvas replay for newly connected users
* Raft leader election
* Automatic leader failover
* Log replication
* Log consistency checks using `prevLogIndex` and `prevLogTerm`
* Commit index tracking
* Dockerized deployment

## How Raft Works

### 1. Leader Election

When the replicas start, they initially act as followers.

Each follower has a randomized election timeout. If a follower does not receive a heartbeat from the current leader within this timeout, it starts an election.

The candidate:

1. Increments its current term
2. Votes for itself
3. Requests votes from other replicas
4. Becomes the leader after receiving votes from a majority

### 2. Client Drawing Operation

When a user draws on the canvas, the frontend sends the drawing operation to the gateway through a WebSocket connection.

```text
Browser
   |
   | WebSocket
   v
Gateway
   |
   | HTTP
   v
Raft Leader
```

### 3. Log Replication

The leader adds the drawing operation to its local Raft log.

It then sends the log entry to the follower replicas.

The replication process uses Raft log consistency information such as:

* `prevLogIndex`
* `prevLogTerm`
* Current term
* Log entries
* `commitIndex`

### 4. Majority Commitment

The leader waits for acknowledgement from the replicas.

With three replicas, at least two replicas must agree before an entry is considered committed.

```text
Replica 1   Replica 2   Replica 3
 Leader     Follower    Follower
    |           |           |
    +-----------+-----------+
                |
          Majority = 2
                |
                v
             Commit
```

Once the entry is committed, the leader updates its `commitIndex` and the operation can be applied to the application state.

### 5. Heartbeats

The leader periodically sends heartbeat messages to followers.

Heartbeats are used to:

* Inform followers that the leader is still active
* Prevent unnecessary elections
* Propagate the latest `commitIndex`

### 6. Leader Failure

If the leader stops responding, followers eventually stop receiving heartbeats.

A follower then starts a new election.

If it receives votes from a majority of replicas, it becomes the new leader.

```text
Old Leader
    X
    |
    | Failure
    v
Followers detect timeout
    |
    v
New election
    |
    v
New Leader
```

## Project Structure

```text
Mini-Raft/
│
├── frontend/
│   ├── canvas.js
│   ├── index.html
│   └── stylesheet.css
│
├── raft/
│   └── replicate.js
│
├── routes/
│   └── strokes.js
│
├── docker-compose.yml
├── Dockerfile.gateway
├── Dockerfile.replica
├── index.js
├── store.js
├── package.json
├── package-lock.json
└── README.md
```

### `frontend/`

Contains the client-side drawing application.

* `index.html` — application interface and canvas
* `canvas.js` — drawing logic and WebSocket communication
* `stylesheet.css` — application styling

### `raft/`

Contains the Raft replication logic.

* `replicate.js` — handles communication and log replication between Raft replicas

### `routes/`

Contains backend API routes.

* `strokes.js` — handles drawing stroke operations

### `index.js`

Main server entry point. It initializes the server and handles the gateway/backend functionality.

### `store.js`

Maintains the application's shared state, including drawing and replica-related state.

### Docker Files

* `Dockerfile.gateway` — builds the gateway container
* `Dockerfile.replica` — builds the replica container
* `docker-compose.yml` — starts the gateway and Raft replica cluster

## Tech Stack

### Frontend

* HTML
* CSS
* JavaScript
* HTML5 Canvas
* WebSockets

### Backend

* Node.js
* Express.js
* WebSocket (`ws`)
* Axios

### Distributed Systems

* Raft consensus algorithm
* Leader election
* Heartbeats
* Log replication
* Majority-based commitment
* Log consistency checks
* Commit index tracking

### Infrastructure

* Docker
* Docker Compose

## Prerequisites

* Docker Desktop
* Git

Node.js is not required when running the application through Docker.

## Running the Project

Clone the repository:

```bash
git clone https://github.com/Anushka-Mandal/Mini-Raft.git
cd Mini-Raft
```

Start the complete application:

```bash
docker-compose up --build
```

After the containers start, open:

```text
http://localhost:3000
```

To stop the application:

```bash
docker-compose down
```

## Testing Leader Failover

The leader election mechanism can be tested by intentionally stopping the current leader.

1. Start the application using Docker Compose.
2. Wait for the Raft cluster to elect a leader.
3. Open the application at `http://localhost:3000`.
4. Draw several strokes.
5. Identify the current leader container.
6. Stop the leader container.
7. Wait for the election timeout.
8. The remaining replicas should begin a new election.
9. A new leader should be elected.
10. The system can continue processing drawing operations through the new leader.

This demonstrates the fault-tolerance and leader-election behavior of the Raft implementation.

## Data Flow

A drawing operation follows this general flow:

```text
User draws
     |
     v
Canvas
     |
     | WebSocket
     v
Gateway
     |
     | Forward operation
     v
Raft Leader
     |
     | Replicate log entry
     +----------------------+
     |                      |
     v                      v
Follower 1              Follower 2
     |                      |
     +----------+-----------+
                |
        Majority acknowledgement
                |
                v
             Commit
                |
                v
          Update state
                |
                v
       Broadcast to clients
```

## Known Limitations

This project is an educational implementation of Raft and is not intended to be a production-ready distributed storage system.

### In-Memory State

The Raft log and application state are stored in memory.

Restarting a replica causes its in-memory state to be lost.

### No Persistent Log

The current implementation does not persist committed log entries to disk.

A production system would require durable storage so that committed operations survive server restarts.

### Temporary Unavailability During Elections

When a leader fails, there may be a short period of unavailability while the cluster detects the failure and elects a new leader.

### No Authentication

The application currently does not provide authentication or user identity management.

### Simplified Raft Implementation

The project focuses on the core concepts of Raft:

* Leader election
* Heartbeats
* Log replication
* Log consistency
* Commit tracking

It does not attempt to implement every optimization and production-level feature found in mature Raft implementations.

## Future Improvements

Possible future improvements include:

* Persistent Raft logs
* Log compaction
* Snapshotting
* Replica recovery
* Improved client retry handling
* Authentication and user accounts
* Persistent canvas state
* Automated tests for leader election
* Automated tests for log replication
* Monitoring and health checks

## Learning Objectives

This project was built to understand the practical implementation of distributed systems and consensus algorithms.

The main concepts demonstrated include:

* Distributed consensus
* Leader election
* Fault tolerance
* Replication
* Log consistency
* Majority-based commitment
* Heartbeats
* Failure detection
* WebSocket-based real-time communication
* Containerized distributed services

## License

This project is intended for educational purposes.
