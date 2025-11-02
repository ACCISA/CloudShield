variable "ubuntu_ami" {
  description = "AMI ID to use for EC2 instances that will run OpenVPN Server and Samba Domain Controller"
  type        = string
  default     = "ami-0dd67d541aa70c8b9"
}

variable "workstation_ami" {
  description = "AMI ID to use for workstations"
  type        = string
  default     = "ami-00f488e2453f5788f"

}

variable "workstation_count" {
  description = "The number of workstations to create"
  type        = number
  default     = 0
}

variable "org_id" {
  description = "Organization ID passed from backend"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
}

// Open VPN config

variable "openvpn_address" {
  description = "Address for OpenVPN server"
  type        = string
  default     = ""
}
variable "openvpn_port" {
  description = "Port for OpenVPN server"
  type        = number
  default     = 1194
}

variable "openvpn_protocol" {
  description = "Protocol for OpenVPN server"
  type        = string
  default     = "udp"
}

variable "openvpn_subnet" {
  description = "Subnet for OpenVPN clients"
  type        = string
  default     = ""

}

variable "openvpn_client_name" {
  description = "Client name for OpenVPN"
  type        = string
  default     = "client1"

}

variable "openvpn_dns" {
  description = "DNS servers for OpenVPN seperated by space"
  type        = string
  default     = ""
}

variable "openvpn_routes" {
  description = "Additional routes for OpenVPN clients"
  type        = list(string)
  default     = []
}

variable "dc_admin_password" {
  description = "Administrator password for the Samba Domain Controller"
  type        = string
  default     = "4162728abb29acc12090e6432cdb6fd8%$@!"
  sensitive   = true
}

variable "domain_name" {
  description = "Domain name for the Samba Domain Controller"
  type        = string
  default     = "samba"
  sensitive   = true
}

variable "realm_name" {
  description = "Realm name for the Samba Domain Controller"
  type        = string
  default     = "samba.local"
  sensitive   = true
}

variable "domain_admin_user" {
  description = "Administrator username for the Samba Domain Controller"
  type        = string
  default     = "Administrator"
}
