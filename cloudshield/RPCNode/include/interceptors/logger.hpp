#pragma once

#include <grpcpp/grpcpp.h>
#include <grpcpp/support/interceptor.h>
#include <grpcpp/support/server_interceptor.h>

class LoggerInterceptor final : public grpc::experimental::Interceptor
{
public:
	explicit LoggerInterceptor(grpc::experimental::ServerRpcInfo *info)
	{
		std::string method = info->method();

		if (method == "unknown")
		{
			std::cout << "Unimplemented RPC was called" << std::endl;
			return;
		}

		std::cout << "RPC called: " << method << std::endl;
	}

	void Intercept(grpc::experimental::InterceptorBatchMethods *methods)
	{
		methods->Proceed();
	}
};

class LoggerInterceptorFactory : public grpc::experimental::ServerInterceptorFactoryInterface
{
public:
	grpc::experimental::Interceptor* CreateServerInterceptor(grpc::experimental::ServerRpcInfo *info)
	{
		return new LoggerInterceptor(info);
	}
};
