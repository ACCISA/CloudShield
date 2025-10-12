variable "create_windows_ami" {
  description = "Create a Windows AMI from a builder instance."
  type        = bool
  default     = true
}

variable "windows_base_ssm_parameter" {
  description = "SSM parameter name for the Windows base AMI"
  type        = string
  default     = "/aws/service/ami-windows-latest/Windows_Server-2022-English-Full-Base"
}
variable "enable_agent_s3_upload" {
  description = "If true, upload the agent binary to S3 and give builder instance access to download it."
  type        = bool
  default     = true
}

# (optional) custom bucket name: if empty Terraform will generate one
variable "agent_bucket_name" {
  description = "Optional S3 bucket name. Leave empty to let Terraform create a unique bucket name."
  type        = string
  default     = ""
}
