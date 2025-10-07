output "created_windows_ami_id" {
  description = "AMI ID created for the Windows builder (empty if not created)"
  value       = aws_ami_from_instance.cloudshield_windows[0].id
}

output "builder_instance_id" {
  description = "Instance ID of the Windows builder instance"
  value       = aws_instance.windows_builder[0].id
}

output "agent_s3_bucket" {
  description = "S3 bucket where the agent binary was uploaded"
  value       = aws_s3_bucket.agent_bucket.bucket
}
