# Look up latest Windows base AMI via SSM
data "aws_ssm_parameter" "windows_base" {
  name = var.windows_base_ssm_parameter
}

locals {
  ami_name = "cloudshield-${var.org_id}"
}

# Builder instance (only created if create_windows_ami=true)
resource "aws_instance" "windows_builder" {
  count                      = var.create_windows_ami ? 1 : 0

  ami                         = data.aws_ssm_parameter.windows_base.value
  instance_type               = "t3.medium"
  subnet_id                   = aws_subnet.org_id_public_subnet.id
  vpc_security_group_ids      = [aws_security_group.allow_rdp.id]
  associate_public_ip_address = true
  key_name                    = aws_key_pair.org_id_key.key_name

  # IMPORTANT: give the instance the profile that allows S3 GetObject
  iam_instance_profile = aws_iam_instance_profile.builder_profile.name

  # Render userdata and pass installer + S3 bucket/key that templated user-data expects
  user_data = templatefile("${path.module}/userdata.ps1.tpl", {
    installer      = file("${path.module}/install_agent_service.ps1"),
    s3_bucket_name = aws_s3_bucket.agent_bucket.bucket,
    s3_object_key  = aws_s3_bucket_object.agent_exe.key
  })

  tags = {
    Name = "cloudshield-windows-builder-${var.org_id}"
    Org  = var.org_id
    Role = "ami-builder"
  }
}


# Create an AMI from the builder instance
resource "aws_ami_from_instance" "cloudshield_windows" {
  count              = var.create_windows_ami ? 1 : 0
  name               = local.ami_name
  source_instance_id = aws_instance.windows_builder[0].id
  description        = "CloudShield Windows AMI for ${var.org_id}"
  tags = {
    Name    = local.ami_name
    Org     = var.org_id
    BuiltBy = "terraform"
  }
  # snapshot_without_reboot = false  # default safe behavior (instance stopped/restarted)
}

