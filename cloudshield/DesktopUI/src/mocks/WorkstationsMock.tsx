import {
  Workstation,
  WorkstationTemplate,
  WorkstationStatus,
} from "../models/Workstations";

export const mockWorkstationTemplates: WorkstationTemplate[] = [
  {
    name: "Windows 10 Pro",
    org_id: "org123",
    description: "A workstation template with Windows 10 Pro installed.",
    software: [
      {
        name: "Microsoft Office",
        description: "Office suite including Word, Excel, and PowerPoint.",
        path: "C:\\Program Files\\Microsoft Office\\Office16\\WINWORD.EXE",
      },
      {
        name: "Google Chrome",
        description: "Google's web browser.",
        path: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      },
    ],
    is_ready: true,
    access_groups: ["group1", "group2"],
  },
  {
    name: "Windows 11 Pro",
    org_id: "org123",
    description: "A workstation template with Windows 11 Pro installed.",
    software: [
      {
        name: "Microsoft Edge",
        description: "Microsoft's web browser.",
        path: "C:\\path\\to\\edge.exe",
      },
      {
        name: "Visual Studio Code",
        description: "Source code editor developed by Microsoft.",
        path: "C:\\path\\to\\vscode.exe",
      },
    ],
    is_ready: false,
    access_groups: ["group1"],
  },
];

export const mockWorkstations: Workstation[] = [
  {
    org_id: "org123",
    template_id: "template1",
    mac: "00:1A:2B:3C:4D:5E",
    ipv4_address: "192.168.122.106",
    status: WorkstationStatus.Active,
  },
  {
    org_id: "org123",
    template_id: "template2",
    mac: "00:1A:2B:3C:4D:5F",
    ipv4_address: "192.168.1.101",
    status: WorkstationStatus.Active,
  },
];
