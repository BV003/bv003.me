---
title: "Book Notes: System Design"
slug: "system-design"
pubDate: 2026-07-16
tags: ["Tech"]
---

### Citation
Record about learn book 'System Design Interview'.

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

#### API Design

#### High-level design
primary-secondary(主从结构)

#### Algorithms to fetch nearby businesses
Hash: even grid, geohash, cartesian tiers [12], etc.
Tree: quadtree, Google S2, RTree [13], etc.

Use GeoHash

However, the reverse is not true: two locations can be very close but
have no shared prefix at all.