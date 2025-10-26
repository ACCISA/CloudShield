# ---- S3 bucket to hold the agent binary (private) ----
resource "aws_s3_bucket" "agent_bucket" {
  bucket = lower("${var.org_id}-cloudshield-agent-${random_id.bucket_suffix.hex}")
  acl    = "private"

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }

  tags = {
    Name = "cloudshield-agent-${var.org_id}"
    Org  = var.org_id
  }
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# upload the locally-present main.exe into the bucket (ensure main.exe is in the module folder)
resource "aws_s3_bucket_object" "agent_exe" {
  bucket = aws_s3_bucket.agent_bucket.id
  key    = "binaries/${var.org_id}/main.exe"
  source = "${path.module}/main.exe"
  etag   = filemd5("${path.module}/main.exe")
  content_type = "application/octet-stream"
}

resource "aws_s3_bucket_object" "agent_install_script" {
  bucket = aws_s3_bucket.agent_bucket.id
  key    = "scripts/${var.org_id}/install_agent_service.ps1"
  source = "${path.module}/install_agent_service.ps1"
  etag   = filemd5("${path.module}/install_agent_service.ps1")
  content_type = "text/plain"
}

# ---- IAM role for EC2 builder to read the S3 object ----
data "aws_iam_policy_document" "ec2_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "builder_role" {
  name               = "${var.org_id}-cloudshield-builder-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json

  tags = {
    Org = var.org_id
  }
}

# Inline policy allowing GetObject only for our bucket/key prefix
resource "aws_iam_role_policy" "allow_s3_get" {
  name = "${var.org_id}-allow-get-agent"
  role = aws_iam_role.builder_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowGetAgentObject"
        Effect    = "Allow"
        Action    = [
          "s3:GetObject",
          "s3:GetObjectAcl"
        ]
        Resource = [
          "arn:aws:s3:::${aws_s3_bucket.agent_bucket.bucket}/binaries/${var.org_id}/*",
          "arn:aws:s3:::${aws_s3_bucket.agent_bucket.bucket}/scripts/${var.org_id}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_instance_profile" "builder_profile" {
  name = "${var.org_id}-cloudshield-builder-profile"
  role = aws_iam_role.builder_role.name
}
