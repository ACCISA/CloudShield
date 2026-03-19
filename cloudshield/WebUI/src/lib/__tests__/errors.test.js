import { getUserErrorMessage } from "../errors";

describe("getUserErrorMessage", () => {
  it("returns session expired message for 401", () => {
    const err = { response: { status: 401 } };

    expect(getUserErrorMessage(err)).toBe(
      "Your session expired. Please sign in again."
    );
  });

  it("returns permission message for 403", () => {
    const err = { response: { status: 403 } };

    expect(getUserErrorMessage(err)).toBe(
      "You don’t have permission to perform this action."
    );
  });

  it("returns not found message for 404", () => {
    const err = { response: { status: 404 } };

    expect(getUserErrorMessage(err)).toBe(
      "We couldn’t find what you requested."
    );
  });

  it("returns API message for 409 when response.data.message exists", () => {
    const err = {
      response: {
        status: 409,
        data: { message: "User already exists" },
      },
    };

    expect(getUserErrorMessage(err)).toBe("User already exists");
  });

  it("returns API error for 409 when response.data.error exists", () => {
    const err = {
      response: {
        status: 409,
        data: { error: "Duplicate value" },
      },
    };

    expect(getUserErrorMessage(err)).toBe("Duplicate value");
  });

  it("returns default 409 message when no api message is present", () => {
    const err = {
      response: {
        status: 409,
        data: {},
      },
    };

    expect(getUserErrorMessage(err)).toBe(
      "This already exists. Try a different value."
    );
  });

  it("returns server-side message for 500+", () => {
    const err = { response: { status: 500 } };

    expect(getUserErrorMessage(err)).toBe(
      "Something went wrong on our side. Please try again."
    );
  });

  it("returns api message for non-special status codes", () => {
    const err = {
      response: {
        status: 400,
        data: { message: "Bad request payload" },
      },
    };

    expect(getUserErrorMessage(err)).toBe("Bad request payload");
  });

  it("returns api error for non-special status codes when message is missing", () => {
    const err = {
      response: {
        status: 422,
        data: { error: "Validation failed" },
      },
    };

    expect(getUserErrorMessage(err)).toBe("Validation failed");
  });

  it("returns err.message when api message is unavailable", () => {
    const err = { message: "Network Error" };

    expect(getUserErrorMessage(err)).toBe("Network Error");
  });

  it("returns generic fallback when err is null", () => {
    expect(getUserErrorMessage(null)).toBe(
      "Something went wrong. Please try again."
    );
  });

  it("returns generic fallback when err is undefined", () => {
    expect(getUserErrorMessage(undefined)).toBe(
      "Something went wrong. Please try again."
    );
  });
});