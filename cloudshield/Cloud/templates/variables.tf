variable "ubuntu_ami" {
  description = "AMI ID to use for EC2 instances that will run OpenVPN Server and Samba Domain Controller"
  type        = string
  default     = "ami-052f47efa5f766ee3"
}

variable "workstation_ami" {
  description = "AMI ID to use for workstations"
  type        = string
  default     = "ami-052f47efa5f766ee3"

}

variable "org_id" {
  description = "Organization ID passed from backend"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
}