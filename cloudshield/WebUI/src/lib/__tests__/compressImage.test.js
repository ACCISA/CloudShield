import { compressImage } from "../compressImage";

describe("compressImage", () => {
  const originalImage = global.Image;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const originalCreateElement = document.createElement;

  let createObjectURLMock;
  let revokeObjectURLMock;
  let drawImageMock;
  let toDataURLMock;

  beforeEach(() => {
    createObjectURLMock = jest.fn(() => "blob:mock-url");
    revokeObjectURLMock = jest.fn();
    drawImageMock = jest.fn();
    toDataURLMock = jest.fn(() => "data:image/jpeg;base64,compressed");

    URL.createObjectURL = createObjectURLMock;
    URL.revokeObjectURL = revokeObjectURLMock;

    document.createElement = jest.fn((tag) => {
      if (tag !== "canvas") return originalCreateElement.call(document, tag);
      return {
        width: 0,
        height: 0,
        getContext: jest.fn(() => ({ drawImage: drawImageMock })),
        toDataURL: toDataURLMock,
      };
    });
  });

  afterEach(() => {
    global.Image = originalImage;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    document.createElement = originalCreateElement;
    jest.clearAllMocks();
  });

  test("scales down oversized images proportionally with default settings", async () => {
    global.Image = class MockImage {
      constructor() {
        this.width = 2000;
        this.height = 1000;
      }

      set src(_value) {
        setTimeout(() => this.onload && this.onload(), 0);
      }
    };

    const result = await compressImage(new Blob(["x"]));

    expect(createObjectURLMock).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:mock-url");
    expect(drawImageMock).toHaveBeenCalledWith(
      expect.anything(),
      0,
      0,
      512,
      256,
    );
    expect(toDataURLMock).toHaveBeenCalledWith("image/jpeg", 0.75);
    expect(result).toBe("data:image/jpeg;base64,compressed");
  });

  test("keeps original size when already under max dimensions", async () => {
    global.Image = class MockImage {
      constructor() {
        this.width = 240;
        this.height = 180;
      }

      set src(_value) {
        setTimeout(() => this.onload && this.onload(), 0);
      }
    };

    await compressImage(new Blob(["x"]), {
      maxWidth: 512,
      maxHeight: 512,
      quality: 0.6,
    });

    expect(drawImageMock).toHaveBeenCalledWith(
      expect.anything(),
      0,
      0,
      240,
      180,
    );
    expect(toDataURLMock).toHaveBeenCalledWith("image/jpeg", 0.6);
  });

  test("rejects when image loading fails", async () => {
    global.Image = class MockImage {
      set src(_value) {
        setTimeout(
          () => this.onerror && this.onerror(new Error("load fail")),
          0,
        );
      }
    };

    await expect(compressImage(new Blob(["x"]))).rejects.toThrow(
      "Failed to load image for compression",
    );
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:mock-url");
  });
});
