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