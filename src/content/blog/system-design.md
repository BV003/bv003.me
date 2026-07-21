---
title: "Book Notes: System Design"
slug: "system-design"
pubDate: 2026-07-16
tags: ["Tech"]
---

### Reference Book Overview
Learning notes and core insights from 'System Design Interview' by Alex Xu.


### Proximity Service

领近服务

A proximity service is used to discover nearby places such as restaurants, hotels, theaters, museums, etc., and is a core component that powers features like finding the best restaurants nearby on Yelp or finding k-nearest gas stations on Google Maps.

Functional requirements. 
Based on this conversation, we focus on 3 key features:
Return all businesses based on a user’s location (latitude
and longitude pair) and radius.
Business owners can add, delete or update a business, but
this information doesn’t need to be reflected in real-time.
Customers can view detailed information about a business.

Non-functional requirements.
From the business requirements, we can infer a list of non-
functional requirements. You should also check these with the
interviewer.
Low latency. Users should be able to see nearby
businesses quickly.
Data privacy. Location info is sensitive data. When we
design a location-based service (LBS), we should always
take user privacy into consideration. We need to comply
with data privacy laws like General Data Protection
Regulation (GDPR) [4] and California Consumer Privacy
Act (CCPA) [5], etc.
High availability and scalability requirements. We should
ensure our system can handle the spike in traffic during
peak hours in densely populated areas.

In this section, we discuss the following:
API design
High-level design
Algorithms to find nearby businesses
Data model


#### High-level design
primary-secondary(主从结构)

#### Algorithms to fetch nearby businesses
Hash: even grid, geohash, cartesian tiers [12], etc.
Tree: quadtree, Google S2, RTree [13], etc.

Use GeoHash

However, the reverse is not true: two locations can be very close but
have no shared prefix at all.

#### Design Deep Dive

**Scale the database**
The data for the business table may not all fit in one server, so it is a good candidate for sharding. The easiest approach is to shard everything by business ID. 

There are two ways to structure the table. Option 1: For each geohash key, there is a JSON array of business IDs in a single row. Option 2: If there are multiple businesses in the same geohash,
there will be multiple rows, one for each business. 

**Scale the geospatial index**
In our case, the full dataset for the geospatial index table is not large. However, depending on the read volume, a single database server might not have enough CPU or network bandwidth to handle all read requests. If that is the case, it is necessary to spread the read load among multiple database servers. We can add read replicas, or shard the database. A better approach, in this case, is to have a series of read replicas to help with the read load.

**Caching**
If you find out that caching does fit the business requirements, then you can proceed with discussions about caching strategy. Since business data is relatively stable, we precompute the list of business IDs for a given geohash and store it in a key-value store such as Redis. 

We can get away with one modern Redis server from the memory usage perspective, but to ensure high availability and reduce cross continent latency, we deploy the Redis cluster across the globe.

Makes users physically “closer” to the system. Users from the US West are connected to the data centers in that region, and users from Europe are connected with data centers in Europe.

### Nearby Friends

In proximity services, the addresses for businesses are static as their locations do not change, while in "nearby friends" data is more dynamic because user locations change frequently. 

#### Step 1 - Understand the Problem and Establish Design Scope
Before starting with the design, we need to ask clarification questions to narrow down the scope.

**Functional requirements** Users should be able to see nearby friends on their mobile apps. Each entry in the nearby friend list has a distance and a timestamp indicating when the distance was last updated. Nearby friend lists should be updated every few seconds.

**Non-functional requirements** Low latency. It’s important to receive location updates from friends without too much delay. Reliability. The system needs to be reliable overall, but occasional data point loss is acceptable. 

#### Step 2 - Propose High-Level Design and Get Buy-In

High-level design Peer-to-peer is not practical for a mobile device with sometimes flaky connections and a tight power consumption budget, but the idea sheds some light on the general design direction. 

HTTP is a basic communication rule that works in a simple one-shot way. Every time your browser or app needs data, it sends a separate request to the server, the server sends back one single response, and then their connection shuts down immediately. The server can never send you new information on its own—you have to keep making new requests repeatedly to get updates, and each request carries extra repeated data that wastes small amounts of bandwidth.

WebSocket builds on HTTP to create a long-lasting, two-way connection after one initial setup request. Once this connection opens, it stays active until either side closes it. Both your device and the server can send messages to each other at any moment without starting a new request every time. There is far less extra repeated data sent with each message, so it works much faster for real-time things like live chats, game updates, or live data feeds.

**Load balancer** The load balancer sits in front of the RESTful API servers and the stateful, bi-directional WebSocket servers. It distributes traffic across those servers to spread out load evenly.

**Websocket servers** This is a cluster of stateful servers that handles the near real-time update of friends’ locations. Each client maintains one persistent WebSocket connection to one of these servers. Note “WebSocket connection” and “WebSocket connection handler” are interchangeable in this chapter.

**Redis pub/sub server** Redis pub/sub is a very lightweight message bus. Channels in Redis pub/sub are very cheap to create. A modern Redis server with GBs of memory could hold millions of channels. 

Study Figure7 and Figure8. These images are amazing.

**API design** 
WebSocket: Users send and receive location updates through the WebSocket protocol. At the minimum, we need the following APIs. 
1. Periodic location update
Request: Client sends latitude, longitude, and timestamp.
Response: Nothing.
2. Client receives location updates
Data sent: Friend location data and timestamp.
3. WebSocket initialization
Request: Client sends latitude, longitude, and timestamp.
Response: Client receives friends’ location data.
4. Subscribe to a new friend
Request: WebSocket server sends friend ID.
Response: Friend’s latest latitude, longitude, and timestamp.
5. Unsubscribe a friend
Request: WebSocket server sends friend ID.
Response. Nothing.

HTTP requests: the API servers handle tasks like adding/removing friends, updating user profiles, etc.

**Data model**: The “nearby friends” feature only cares about the current location of a user. Therefore, we only need to store one location per user. Redis is an excellent choice because it provides super-fast read and write operations. It supports TTL, which we use to auto-purge users
from the cache who are no longer active. The current locations do not need to be durably stored. If the Redis instance goes down, we could replace it with an empty new instance and let the cache be filled as new location updates stream in. The active users could miss location updates from friends for an update cycle or two while the new cache warms. It is an acceptable tradeoff. In the deep dive
section, we will discuss ways to lessen the impact on users when the cache gets replaced.

#### Step 3 - Design Deep Dive

**How well does each component scale?**

**WebSocket servers** However, the WebSocket servers are stateful, so care must be taken when removing existing nodes.