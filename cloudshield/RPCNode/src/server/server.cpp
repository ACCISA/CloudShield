#include "server/server.hpp"

InfraNode::InfraNode(std::string server_address, std::shared_ptr<grpc::Service> service, std::string service_name) 
	: server_address_(server_address), service_(service), service_name_(service_name)
{
	this->interceptors_creators_.emplace_back(std::make_unique<LoggerInterceptorFactory>());
}

void InfraNode::Start()
{
	grpc::ServerBuilder builder;

	builder.AddListeningPort(this->server_address_, grpc::InsecureServerCredentials()); // TODO mTLS
	
	builder.experimental().SetInterceptorCreators(std::move(this->interceptors_creators_));
	
	// register our infra service
	builder.RegisterService(this->service_.get());

	this->server_ = builder.BuildAndStart();

	std::cout << this->service_name_ << " listening on " << this->server_address_ << std::endl;

	// wait until shutdown
	this->server_->Wait();
}

void InfraNode::Stop()
{
	std::cout << this->service_name_ << " starting shutdown... " << std::endl;

	this->server_->Shutdown();

	std::cout << this->service_name_ << " node was shutdown " << std::endl;
}
