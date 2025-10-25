#########################
# This is a Terraform template that will be modified with python
# DO NOT EDIT
#########################

provider "aws" {
  region = "ca-central-1"
}

# Key pairs
resource "tls_private_key" "org_id" {
  algorithm = "RSA"
  rsa_bits = 4096
}

resource "aws_key_pair" "org_id_key" {
  key_name   = "${var.org_id}_key"
  public_key = tls_private_key.org_id.public_key_openssh
}

resource "local_file" "private_key" {
  content          = tls_private_key.org_id.private_key_pem
  filename         = "${path.module}/org_id_key.pem"
  file_permission  = "0600"
}

##########################
# 1. VPC
##########################
resource "aws_vpc" "org_id_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = { Name = "org_id_vpc" }
}

##########################
# 2. Internet Gateway
##########################
resource "aws_internet_gateway" "org_id_igw" {
  vpc_id = aws_vpc.org_id_vpc.id
  tags   = { Name = "org_id_igw" }
}

##########################
# 3. Public Subnet
##########################
resource "aws_subnet" "org_id_public_subnet" {
  vpc_id                  = aws_vpc.org_id_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "ca-central-1a"
  map_public_ip_on_launch = true

  tags = { Name = "org_id_public_subnet" }
}

##########################
# 4. Private Subnet
##########################
resource "aws_subnet" "org_id_private_subnet" {
  vpc_id            = aws_vpc.org_id_vpc.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "ca-central-1b"

  tags = { Name = "org_id_private_subnet" }
}

##########################
# 5. Public Route Table
##########################
resource "aws_route_table" "org_id_public_rt" {
  vpc_id = aws_vpc.org_id_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.org_id_igw.id
  }

  tags = { Name = "org_id_public_rt" }
}

resource "aws_route_table_association" "public_assoc" {
  subnet_id      = aws_subnet.org_id_public_subnet.id
  route_table_id = aws_route_table.org_id_public_rt.id
}

##########################
# 6. Private Route Table
##########################
resource "aws_route_table" "org_id_private_rt" {
  vpc_id = aws_vpc.org_id_vpc.id
  tags   = { Name = "org_id_private_rt" }
}

resource "aws_route_table_association" "private_assoc" {
  subnet_id      = aws_subnet.org_id_private_subnet.id
  route_table_id = aws_route_table.org_id_private_rt.id
}

##########################
# 7. NAT Gateway for private subnet
##########################
# Elastic IP for NAT
resource "aws_eip" "org_id_nat_eip" {
  domain = "vpc"
  tags = { Name = "org_id_nat_eip" }
}

# NAT Gateway in public subnet
resource "aws_nat_gateway" "org_id_nat" {
  allocation_id = aws_eip.org_id_nat_eip.id
  subnet_id     = aws_subnet.org_id_public_subnet.id
  tags = { Name = "org_id_nat" }
  depends_on = [aws_internet_gateway.org_id_igw]
}

# Private route to NAT
resource "aws_route" "private_to_internet" {
  route_table_id         = aws_route_table.org_id_private_rt.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.org_id_nat.id
}

##########################
# 8. Security Group (SSH)
##########################
resource "aws_security_group" "allow_ssh" {
  vpc_id = aws_vpc.org_id_vpc.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "AllowSSH" }
}

resource "aws_security_group" "allow_rdp" {
  vpc_id = aws_vpc.org_id_vpc.id

  ingress {
    description = "RDP from anywhere (use with caution)"
    from_port   = 3389
    to_port     = 3389
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "allow-rdp" }
}

# TODO this is for dev, in prod this will be replaced with proper rules
resource "aws_security_group" "allow_all_tcp_udp" {
  vpc_id = aws_vpc.org_id_vpc.id

  ingress {
    description = "Allow all TCP"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Allow all UDP"
    from_port   = 0
    to_port     = 65535
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "allow-all-tcp-udp" }
}
resource "aws_security_group" "allow_openvpn" {
  vpc_id = aws_vpc.org_id_vpc.id

  ingress {
    description = "OpenVPN ${var.openvpn_protocol} ${var.openvpn_port}"
    from_port   = var.openvpn_port
    to_port     = var.openvpn_port
    protocol    = var.openvpn_protocol
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "AllowOpenVPN" }
}
##########################
# 9. EC2 instance in Public Subnet
##########################
resource "aws_instance" "org_id_openvpn_server" {
  ami                         = var.ubuntu_ami
  instance_type               = "t2.micro"
  subnet_id                   = aws_subnet.org_id_public_subnet.id
  vpc_security_group_ids      = [aws_security_group.allow_ssh.id, aws_security_group.allow_openvpn.id, aws_security_group.allow_all_tcp_udp.id]
  associate_public_ip_address = true
  key_name                    = aws_key_pair.org_id_key.key_name
  user_data = templatefile("${path.module}/scripts/setup_openvpn.tftpl", {
  openvpn_port      = var.openvpn_port
  openvpn_protocol  = var.openvpn_protocol
  openvpn_subnet    = var.openvpn_subnet
  openvpn_client_name = var.openvpn_client_name
  openvpn_dns      = var.openvpn_dns
  openvpn_address  = var.openvpn_address
  openvpn_routes   = var.openvpn_routes
})
  tags = { Name = "org_id_openvpn_server" }
}

##########################
# 10. EC2 instance in Private Subnet
##########################
resource "aws_instance" "org_id_domain_controller" {
  ami                    = var.ubuntu_ami
  instance_type          = "t2.micro"
  subnet_id              = aws_subnet.org_id_private_subnet.id
  vpc_security_group_ids = [aws_security_group.allow_ssh.id]
  key_name               = aws_key_pair.org_id_key.key_name
  tags = { Name = "org_id_domain_controller" }
}

resource "aws_instance" "org_id_workstation" {
  ami                    = var.workstation_ami
  count                  = var.workstation_enable ? var.workstation_count : 0
  instance_type          = "t2.medium"
  subnet_id              = aws_subnet.org_id_private_subnet.id
  vpc_security_group_ids = [aws_security_group.allow_rdp.id]
  key_name               = aws_key_pair.org_id_key.key_name
  tags = { Name = "org_id_workstation" }
}