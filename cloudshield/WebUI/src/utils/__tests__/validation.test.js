import {
  validateUsername,
  validateDisplayName,
  validateGroupName,
  validateShareName,
  validateShareSize,
  validatePassword,
  validateEmail,
  validateDnsZone,
  validateDnsName,
  validateIPv4,
  validateClientName,
  validateRequired,
  validateJobTitle,
  validateAll,
} from "../validation";

describe("validation utilities", () => {
  // ==========================================================================
  // validateUsername
  // ==========================================================================
  describe("validateUsername", () => {
    it("accepts valid usernames", () => {
      expect(validateUsername("john").valid).toBe(true);
      expect(validateUsername("jane_doe").valid).toBe(true);
      expect(validateUsername("user123").valid).toBe(true);
      expect(validateUsername("a.b-c").valid).toBe(true);
    });

    it("rejects empty input", () => {
      const r = validateUsername("");
      expect(r.valid).toBe(false);
      expect(r.error).toMatch(/required/i);
    });

    it("rejects usernames with shell metacharacters", () => {
      expect(validateUsername("user;rm -rf /").valid).toBe(false);
      expect(validateUsername("user$(cmd)").valid).toBe(false);
      expect(validateUsername("user|cat").valid).toBe(false);
      expect(validateUsername("user&bg").valid).toBe(false);
      expect(validateUsername("user`tick`").valid).toBe(false);
    });

    it("rejects usernames with spaces", () => {
      expect(validateUsername("john doe").valid).toBe(false);
    });

    it("rejects usernames exceeding 64 characters", () => {
      expect(validateUsername("a".repeat(65)).valid).toBe(false);
    });

    it("accepts usernames up to 64 characters", () => {
      expect(validateUsername("a".repeat(64)).valid).toBe(true);
    });
  });

  // ==========================================================================
  // validateDisplayName
  // ==========================================================================
  describe("validateDisplayName", () => {
    it("accepts valid display names with spaces", () => {
      expect(validateDisplayName("John Doe").valid).toBe(true);
      expect(validateDisplayName("María García").valid).toBe(true);
    });

    it("rejects empty input", () => {
      expect(validateDisplayName("").valid).toBe(false);
    });

    it("rejects names with shell metacharacters", () => {
      expect(validateDisplayName("John;Doe").valid).toBe(false);
      expect(validateDisplayName("name$(cmd)").valid).toBe(false);
    });
  });

  // ==========================================================================
  // validateGroupName
  // ==========================================================================
  describe("validateGroupName", () => {
    it("accepts valid group names", () => {
      expect(validateGroupName("Developers").valid).toBe(true);
      expect(validateGroupName("IT-Team").valid).toBe(true);
      expect(validateGroupName("group_01").valid).toBe(true);
    });

    it("rejects empty input", () => {
      expect(validateGroupName("").valid).toBe(false);
    });

    it("rejects group names with injection attempts", () => {
      expect(validateGroupName("group;drop").valid).toBe(false);
      expect(validateGroupName("group|pipe").valid).toBe(false);
      expect(validateGroupName("group$(sub)").valid).toBe(false);
    });
  });

  // ==========================================================================
  // validateShareName
  // ==========================================================================
  describe("validateShareName", () => {
    it("accepts valid share names", () => {
      expect(validateShareName("Documents").valid).toBe(true);
      expect(validateShareName("shared_files").valid).toBe(true);
      expect(validateShareName("team-drive").valid).toBe(true);
    });

    it("rejects empty input", () => {
      expect(validateShareName("").valid).toBe(false);
    });

    it("rejects share names with path traversal", () => {
      expect(validateShareName("../etc").valid).toBe(false);
      expect(validateShareName("share/sub").valid).toBe(false);
    });

    it("rejects share names with shell metacharacters", () => {
      expect(validateShareName("share;rm").valid).toBe(false);
    });
  });

  // ==========================================================================
  // validateShareSize
  // ==========================================================================
  describe("validateShareSize", () => {
    it("accepts valid numeric sizes", () => {
      expect(validateShareSize("100").valid).toBe(true);
      expect(validateShareSize("1").valid).toBe(true);
      expect(validateShareSize("99999").valid).toBe(true);
    });

    it("rejects non-numeric values", () => {
      expect(validateShareSize("abc").valid).toBe(false);
      expect(validateShareSize("10;rm").valid).toBe(false);
      expect(validateShareSize("100MB").valid).toBe(false);
    });

    it("rejects zero or negative", () => {
      expect(validateShareSize("0").valid).toBe(false);
      expect(validateShareSize("-5").valid).toBe(false);
    });

    it("rejects empty input", () => {
      expect(validateShareSize("").valid).toBe(false);
    });
  });

  // ==========================================================================
  // validatePassword
  // ==========================================================================
  describe("validatePassword", () => {
    it("accepts strong passwords", () => {
      expect(validatePassword("MyP@ssw0rd#x").valid).toBe(true);
      expect(validatePassword("Str0ng#Pass99").valid).toBe(true);
    });

    it("rejects short passwords", () => {
      expect(validatePassword("Ab1!").valid).toBe(false);
    });

    it("rejects empty input", () => {
      expect(validatePassword("").valid).toBe(false);
    });

    it("allows shell-like characters when strength requirements are met", () => {
      expect(validatePassword("Pass;word12!").valid).toBe(true);
      expect(validatePassword("Pass|word12!").valid).toBe(true);
      expect(validatePassword("Pass`word12!").valid).toBe(true);
      expect(validatePassword("Pass$(cmd)12!").valid).toBe(true);
    });
  });

  // ==========================================================================
  // validateEmail
  // ==========================================================================
  describe("validateEmail", () => {
    it("accepts valid emails", () => {
      expect(validateEmail("user@example.com").valid).toBe(true);
      expect(validateEmail("first.last@company.org").valid).toBe(true);
    });

    it("rejects invalid emails", () => {
      expect(validateEmail("notanemail").valid).toBe(false);
      expect(validateEmail("@domain.com").valid).toBe(false);
      expect(validateEmail("user@").valid).toBe(false);
    });

    it("rejects empty input", () => {
      expect(validateEmail("").valid).toBe(false);
    });
  });

  // ==========================================================================
  // validateIPv4
  // ==========================================================================
  describe("validateIPv4", () => {
    it("accepts valid IPs", () => {
      expect(validateIPv4("192.168.1.1").valid).toBe(true);
      expect(validateIPv4("10.0.0.1").valid).toBe(true);
      expect(validateIPv4("255.255.255.255").valid).toBe(true);
    });

    it("rejects invalid IPs", () => {
      expect(validateIPv4("999.999.999.999").valid).toBe(false);
      expect(validateIPv4("1.2.3").valid).toBe(false);
      expect(validateIPv4("not.an.ip.addr").valid).toBe(false);
    });

    it("rejects IPs with injection", () => {
      expect(validateIPv4("1.1.1.1;rm").valid).toBe(false);
    });
  });

  // ==========================================================================
  // validateDnsZone / validateDnsName
  // ==========================================================================
  describe("validateDnsZone", () => {
    it("accepts valid DNS zones", () => {
      expect(validateDnsZone("example.com").valid).toBe(true);
      expect(validateDnsZone("sub.domain.org").valid).toBe(true);
    });

    it("rejects invalid zones", () => {
      expect(validateDnsZone("").valid).toBe(false);
      expect(validateDnsZone("zone;drop").valid).toBe(false);
    });
  });

  describe("validateDnsName", () => {
    it("accepts valid DNS names", () => {
      expect(validateDnsName("www").valid).toBe(true);
      expect(validateDnsName("mail-server").valid).toBe(true);
    });

    it("rejects invalid DNS names", () => {
      expect(validateDnsName("").valid).toBe(false);
      expect(validateDnsName("name;evil").valid).toBe(false);
    });
  });

  // ==========================================================================
  // validateClientName
  // ==========================================================================
  describe("validateClientName", () => {
    it("accepts valid client names", () => {
      expect(validateClientName("client01").valid).toBe(true);
      expect(validateClientName("vpn-user").valid).toBe(true);
    });

    it("rejects names with injection", () => {
      expect(validateClientName("client;rm").valid).toBe(false);
      expect(validateClientName("client$(cmd)").valid).toBe(false);
    });
  });

  // ==========================================================================
  // validateRequired
  // ==========================================================================
  describe("validateRequired", () => {
    it("accepts non-empty values", () => {
      expect(validateRequired("hello", "Field").valid).toBe(true);
    });

    it("rejects empty or whitespace-only", () => {
      expect(validateRequired("", "Field").valid).toBe(false);
      expect(validateRequired("   ", "Field").valid).toBe(false);
    });
  });

  // ==========================================================================
  // validateJobTitle
  // ==========================================================================
  describe("validateJobTitle", () => {
    it("accepts valid job titles", () => {
      expect(validateJobTitle("Software Engineer").valid).toBe(true);
      expect(validateJobTitle("VP of Engineering").valid).toBe(true);
    });

    it("accepts empty (optional field)", () => {
      expect(validateJobTitle("").valid).toBe(true);
    });

    it("rejects titles with shell metacharacters", () => {
      expect(validateJobTitle("Engineer;rm").valid).toBe(false);
    });
  });

  // ==========================================================================
  // validateAll
  // ==========================================================================
  describe("validateAll", () => {
    it("returns first error when inputs are invalid", () => {
      const result = validateAll([
        validateUsername(""),
        validateEmail("bad"),
      ]);
      expect(result.valid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("returns ok when all inputs are valid", () => {
      const result = validateAll([
        validateUsername("john"),
        validateEmail("john@test.com"),
      ]);
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it("returns first failing result in mixed input", () => {
      const result = validateAll([
        validateUsername("valid_user"),
        validateEmail("not-valid"),
      ]);
      expect(result.valid).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });
});
