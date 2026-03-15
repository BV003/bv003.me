---
title: "Determine my early career direction"
slug: "Determine_my_early_career_direction"
pubDate: 2026-3-12
description: ""
subtitle: "找到未来三年我的技术主线"
tags: ["Tech"]
---

### Something will not replaced by AI
当我使用上Vibe coding的时候，我就意识到某些事情正在发生深刻的改变。
怪不得很多PM类似的人总会说要取代程序员，我也真的看到单位上有同事没有经验也可以做出网页作品出来。
在这种情况下，留给我们传科班学生的出路在哪里呢？
AI告诉我应该专注于复杂任务或者结合具体任务，我对结合业务兴趣不大，让我们来聊聊专注于复杂任务。
如，分布式系统，高并发与负载均衡，尽管我也不是很确定，但是往更多人使用和更核心的这个方向没有错误。
我在工作时也要有意识地朝这个方向靠拢。
规模小的软件开发和前端已经失去意义了。


### Infra
突然迷上了infra这一块，我喜欢用杠铃原则从事确定性强的工程工作。
这其实是一个很大的概念，让AI帮我简单地进行了分类。

| **工种**                    | **工作内容**                                                                                           | **技术栈**                                                                                                                                                                                                  | **技术语言**                                                                                                                                                                |
|---------------------------|------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **1. AI 硬件工程师 (AI Hardware Engineer)** | 负责硬件资源的配置与管理，设计并优化用于 AI 计算的硬件平台（如 GPU、TPU、FPGA）。                                           | - **硬件资源**：NVIDIA GPU (Tesla, A100), Google TPU, Intel FPGA<br> - **硬件优化**：CUDA, cuDNN, TensorRT<br> - **硬件监控工具**：nvidia-smi, GPU-Z                                                  | - **C/C++**：硬件接口与优化<br> - **Python**：与硬件接口交互与管理<br> - **Verilog/VHDL**：硬件设计                                                                 |
| **2. AI 基础设施工程师 (AI Infrastructure Engineer)** | 设计和管理计算资源和存储资源的分配，确保 AI 计算任务的高效运行。包括高性能计算资源的配置和管理。                             | - **云计算平台**：AWS, GCP, Azure, OpenStack<br> - **计算资源管理**：Slurm, Apache Mesos, Kubernetes<br> - **容器化技术**：Docker, Kubernetes                                                      | - **Python**：自动化脚本和云服务交互<br> - **Go**：开发高效的基础设施管理工具<br> - **Bash/Shell**：脚本自动化管理                                               |
| **3. 数据工程师 (Data Engineer)**          | 设计、开发和优化数据管道，处理大规模数据存储和流处理任务，支持 AI 模型训练。                                                 | - **大数据框架**：Apache Spark, Hadoop, Apache Flink<br> - **ETL 工具**：Apache NiFi, Talend, Airflow<br> - **数据库**：PostgreSQL, MySQL, Google BigQuery, Snowflake                                  | - **Python**：数据处理与脚本<br> - **Scala**：大数据处理<br> - **SQL**：数据查询与管理<br> - **Java**：大数据框架（如 Hadoop）                                   |
| **4. 网络工程师 (Networking Engineer)**     | 管理网络通信层，优化跨节点的数据传输，确保低延迟和高带宽。负责数据在 AI 系统中流动的高效传输。                                  | - **网络协议**：gRPC, HTTP/2, WebSocket<br> - **高速通信**：RDMA, InfiniBand<br> - **负载均衡**：Nginx, HAProxy                                                                                         | - **C/C++**：实现高效网络协议和通信优化<br> - **Python**：网络监控和自动化配置<br> - **Bash/Shell**：网络脚本与管理                                             |
| **5. 存储工程师 (Storage Engineer)**         | 设计并优化存储架构，确保大规模数据的高效存取和持久化存储。负责数据存储的性能、可扩展性和安全性。                                | - **分布式存储**：HDFS, Ceph, Amazon S3, Google Cloud Storage<br> - **数据库**：Cassandra, MongoDB, Redis<br> - **数据管理工具**：DVC, ModelDB                                                       | - **Python**：数据处理与存储管理<br> - **Java**：分布式存储系统开发<br> - **Go**：高性能存储系统实现<br> - **SQL**：存储数据的查询与优化                            |
| **6. ML 平台工程师 (ML Platform Engineer)**  | 构建和维护机器学习平台，支持自动化训练、实验跟踪、模型版本控制等功能，确保快速高效的模型训练和推理。                         | - **机器学习框架**：TensorFlow, PyTorch, JAX, Keras<br> - **模型管理工具**：MLflow, TensorFlow Extended (TFX), DVC<br> - **分布式训练工具**：Horovod, Ray, PyTorch Distributed                          | - **Python**：开发机器学习算法与模型<br> - **Bash/Shell**：自动化脚本<br> - **Go**：开发高效的平台工具<br> - **Java**：用于大规模分布式训练和资源管理              |
| **7. DevOps 工程师 (DevOps Engineer)**       | 负责持续集成与持续部署（CI/CD）工作流的设计与实现，自动化 AI 系统的部署、更新与维护。确保系统的稳定性和高可用性。                | - **自动化工具**：Ansible, Terraform, Chef, Puppet<br> - **CI/CD 工具**：Jenkins, GitLab CI, CircleCI<br> - **容器化与编排**：Docker, Kubernetes                                                    | - **Python**：自动化脚本<br> - **Bash/Shell**：脚本编写<br> - **Groovy**：Jenkins Pipeline 脚本<br> - **Go**：编写高效的 CI/CD 工具                           |
| **8. AI 运维工程师 (AI Operations Engineer)** | 负责 AI 系统的运维，监控 AI 模型推理服务的运行，确保高可用性并优化推理服务的性能。处理故障排查、模型更新等任务。                   | - **监控工具**：Prometheus, Grafana, Datadog<br> - **日志管理工具**：ELK Stack (Elasticsearch, Logstash, Kibana)<br> - **推理服务框架**：TensorFlow Serving, Triton Inference Server, TorchServe           | - **Python**：监控和自动化运维<br> - **Bash/Shell**：运维自动化<br> - **Go**：开发高效的运维工具<br> - **Java**：服务端开发和优化                                 |
| **9. 安全工程师 (Security Engineer)**        | 确保 AI 系统的安全性，保护数据和模型，防止恶意攻击，确保合规性要求。                                                          | - **加密与身份验证**：SSL/TLS, OAuth, JWT, AES<br> - **安全框架与合规性**：GDPR, HIPAA, SOC2<br> - **容器安全工具**：Aqua Security, Twistlock                                                      | - **Python**：自动化安全脚本<br> - **C/C++**：实现安全通信和加密算法<br> - **Go**：开发容器安全工具<br> - **Bash/Shell**：安全审计和监控脚本                           |
| **10. 云架构师 (Cloud Architect)**          | 设计并管理 AI 系统的云架构，确保高可用、弹性伸缩、容错能力和安全性，优化云资源使用，确保云基础设施的长期可扩展性。                 | - **云平台**：AWS, GCP, Azure<br> - **云服务与存储**：S3, Google Cloud Storage, Azure Blob Storage<br> - **架构工具**：Terraform, CloudFormation                                                     | - **Python**：自动化和云服务集成<br> - **Go**：高效的云平台资源管理工具<br> - **Bash/Shell**：云服务管理和部署<br> - **Java**：云平台应用开发                             |
| **11. 系统架构师 (System Architect)**        | 设计 AI 系统的整体架构，确保计算、存储、网络资源的高效协调，提供可扩展、高效的系统设计，解决技术瓶颈问题。                         | - **分布式计算框架**：Apache Kafka, Apache Spark, Kubernetes<br> - **架构设计工具**：UML, ArchiMate<br> - **数据库**：SQL, NoSQL, GraphDB                                                             | - **Python**：系统自动化与优化<br> - **Go**：高效分布式系统开发<br> - **Java**：用于大规模系统架构设计与开发<br> - **C/C++**：低级系统优化和资源管理                     |
| **12. AI 研究工程师 (AI Research Engineer)**  | 从事 AI 算法的研究与开发，提出新算法和优化策略，改进现有模型。                                                                 | - **研究框架**：TensorFlow, PyTorch, JAX<br> - **编程语言**：Python, C++, R<br> - **优化工具**：Optuna, Hyperopt, Ray Tune                                                                        | - **Python**：算法开发与优化<br> - **C++**：性能优化和低级编程<br> - **R**：统计分析与建模<br> - **Julia**：用于高性能计算和算法研究                                 |


我个人感觉infra的工程性会强，同时做的系统也要足够复杂。但是我不是很想深入硬件，因为这一块我并没有很多基础。AI推荐我从事AI 基础设施工程师、机器学习平台工程师、DevOps 工程师、云架构工程师、AI 运维工程师。


### Keep open

