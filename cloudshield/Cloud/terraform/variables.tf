variable "ubuntu_ami" {
  description = "AMI ID to use for EC2 instances that will run OpenVPN Server and Samba Domain Controller"
  type        = string
  default     = "ami-065778886ef8ec7c8"
}

variable "workstation_ami" {
  description = "AMI ID to use for workstations"
  type        = string
  default     = "ami-0bf5a505b44d6f2d0"

}
