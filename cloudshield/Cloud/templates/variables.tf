variable "ubuntu_ami" {
  description = "AMI ID to use for EC2 instances that will run OpenVPN Server and Samba Domain Controller"
  type        = string
  default     = "ami-0dd67d541aa70c8b9"
}

variable "workstation_ami" {
  description = "AMI ID to use for workstations"
  type        = string
  default     = "ami-0dd67d541aa70c8b9"

}
