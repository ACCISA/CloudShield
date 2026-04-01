export type Organization = {
  _id: string;
  name: string;
  package: string;
  domain_name: string;
  realm_name: string;
  dc_admin_password: string;
  workstation_limit: number;
  user_limit: number;
  storage_limit_gb: number | null;
  provisioning_status: "completed" | "in_progress" | "failed" | "destroyed" | "pending";
  provisioning_job_id: string;
  created_at: Date;
  updated_at: Date;
  welcome_email_enqueued: boolean;
  welcome_email_enqueued_at: Date | null;
}

export const mapOrganization = (data: any): Organization => {
  return {
    _id: data._id,
    name: data.name,
    package: data.package,
    domain_name: data.domain_name,
    realm_name: data.realm_name,
    dc_admin_password: data.dc_admin_password,
    workstation_limit: data.workstation_limit,
    user_limit: data.user_limit,
    storage_limit_gb: data.storage_limit_gb,
    provisioning_status: data.provisioning_status,
    provisioning_job_id: data.provisioning_job_id,
    created_at: new Date(data.created_at),
    updated_at: new Date(data.updated_at),
    welcome_email_enqueued: data.welcome_email_enqueued,
    welcome_email_enqueued_at: data.welcome_email_enqueued_at ? new Date(data.welcome_email_enqueued_at) : null,
  };
}