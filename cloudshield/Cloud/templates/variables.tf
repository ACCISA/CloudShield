variable "ubuntu_ami" {
  description = "AMI ID to use for EC2 instances that will run OpenVPN Server and Samba Domain Controller"
  type        = string
  default     = "ami-065778886ef8ec7c8"
}

