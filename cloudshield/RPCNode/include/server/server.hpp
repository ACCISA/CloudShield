#pragma once

#include <string>
#include <memory>
#include <vector>

#include <grpcpp/grpcpp.h>
#include <grpcpp/support/interceptor.h>
#include <grpcpp/support/server_interceptor.h>
#include <grpcpp/server_builder.h>
#include <grpcpp/impl/service_type.h>
#include <grpcpp/security/server_credentials.h>

#include "interceptors/logger.hpp"

class InfraNode
{
public:
	explicit InfraNode(std::string server_address = "0.0.0.0:50051", std::shared_ptr<grpc::Service> service = nullptr, std::string server_name = "InfraNode");

	void Start();
	void Stop();
private:
	std::unique_ptr<grpc::Server> server_;
	std::shared_ptr<grpc::Service> service_;
	std::string server_address_;
	std::string service_name_;

	// interceptors
	std::vector<std::unique_ptr<grpc::experimental::ServerInterceptorFactoryInterface>> interceptors_creators_;
};
