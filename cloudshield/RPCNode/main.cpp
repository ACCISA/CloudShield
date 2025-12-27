#include <iostream>
#include "infra_service/infra.pb.h"
#include "config/config.hpp"

int main()
{
	try
	{
		Config config = Config::New();
	}
	catch (const std::exception &e)
	{
		std::cerr << e.what() << '\n';
		return 1;
	}
	return 0;
}
