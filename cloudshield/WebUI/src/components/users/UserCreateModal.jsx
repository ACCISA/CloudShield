import { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Modal,
  IconButton,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import DesktopWindowsIcon from "@mui/icons-material/DesktopWindows";
import GroupIcon from "@mui/icons-material/Group";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";

export default function UserCreateModal({ open, onClose, onSubmit }) {
  const workstationOptions = ["WS-001", "WS-002", "WS-003"];
  const groupOptions = ["None", "Sales", "Reception", "Warehouse", "Finance"];
  const folderOptions = [
    "All files",
    "Sales",
    "Reception",
    "Warehouse",
    "Finance",
  ];

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [workstation, setWorkstation] = useState("WS-001");
  const [group, setGroup] = useState("None");
  const [folders, setFolders] = useState([]);

  const submitForm = () => {
    const payload = {
      firstName,
      lastName,
      email,
      jobTitle,
      workstation,
      group,
      folderAccess: folders,
    };
    onSubmit(payload);
    onClose();
  };

  const toggleFolder = (f) => {
    setFolders((p) => (p.includes(f) ? p.filter((x) => x !== f) : [...p, f]));
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          width: "90%",
          maxWidth: 900,
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: "#1A1A1A",
          borderRadius: "16px",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "#fff",
          boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            padding: "20px 26px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Typography sx={{ fontSize: "1.3rem", fontWeight: 600 }}>
            Users › New User
          </Typography>

          <IconButton onClick={onClose} sx={{ color: "#fff" }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr" }}>
          <Box sx={{ padding: "24px 26px" }}>
            <Typography sx={{ mb: 1, opacity: 0.7 }}>First Name</Typography>
            <TextField
              fullWidth
              placeholder="Enter first name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              sx={{
                "& .MuiInputBase-root": {
                  background: "#111",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  paddingLeft: "10px",
                  color: "#fff",
                },
              }}
            />

            <Typography sx={{ mt: 3, mb: 1, opacity: 0.7 }}>
              Last Name
            </Typography>
            <TextField
              fullWidth
              placeholder="Enter last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              sx={{
                "& .MuiInputBase-root": {
                  background: "#111",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  paddingLeft: "10px",
                  color: "#fff",
                },
              }}
            />

            <Typography sx={{ mt: 3, mb: 1, opacity: 0.7 }}>Email</Typography>
            <TextField
              fullWidth
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{
                "& .MuiInputBase-root": {
                  background: "#111",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  paddingLeft: "10px",
                  color: "#fff",
                },
              }}
            />

            <Typography sx={{ mt: 3, mb: 1, opacity: 0.7 }}>
              Job Title
            </Typography>
            <TextField
              fullWidth
              placeholder="Enter job title"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              sx={{
                "& .MuiInputBase-root": {
                  background: "#111",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  paddingLeft: "10px",
                  color: "#fff",
                },
              }}
            />
          </Box>

          <Box
            sx={{
              width: "1px",
              backgroundColor: "rgba(255,255,255,0.12)",
            }}
          />

          <Box sx={{ padding: "24px 26px" }}>
            <Typography sx={{ mb: 1, opacity: 0.7 }}>Workstation</Typography>
            <Box sx={{ position: "relative" }}>
              <DesktopWindowsIcon
                sx={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#FACC15",
                  fontSize: 20,
                }}
              />
              <Select
                fullWidth
                value={workstation}
                onChange={(e) => setWorkstation(e.target.value)}
                sx={{
                  background: "#111",
                  borderRadius: "10px",
                  color: "#fff",
                  pl: "38px !important",
                  "& fieldset": { borderColor: "rgba(255,255,255,0.12)" },
                }}
              >
                {workstationOptions.map((ws) => (
                  <MenuItem value={ws} key={ws}>
                    {ws}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            <Typography sx={{ mt: 3, mb: 1, opacity: 0.7 }}>Group</Typography>
            <Box sx={{ position: "relative" }}>
              <GroupIcon
                sx={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#3B82F6",
                  fontSize: 20,
                }}
              />
              <Select
                fullWidth
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                sx={{
                  background: "#111",
                  borderRadius: "10px",
                  color: "#fff",
                  pl: "38px !important",
                  "& fieldset": { borderColor: "rgba(255,255,255,0.12)" },
                }}
              >
                {groupOptions.map((g) => (
                  <MenuItem value={g} key={g}>
                    {g}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            <Typography sx={{ mt: 4, mb: 1, opacity: 0.7 }}>
              Folder Access
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              {folderOptions.map((f) => (
                <FormControlLabel
                  key={f}
                  control={
                    <Checkbox
                      checked={folders.includes(f)}
                      onChange={() => toggleFolder(f)}
                      sx={{ color: "#fff" }}
                    />
                  }
                  label={f}
                />
              ))}
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            borderTop: "1px solid rgba(255,255,255,0.12)",
            padding: "18px 26px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 2,
          }}
        >
          <Box
            onClick={submitForm}
            sx={{
              border: "1px solid rgba(255,255,255,0.18)",
              color: "#fff",
              px: 3,
              py: 1,
              borderRadius: "10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 1,
              "&:hover": { background: "rgba(255,255,255,0.08)" },
            }}
          >
            <AddOutlinedIcon fontSize="small" />
            Create
          </Box>
        </Box>
      </Box>
    </Modal>
  );
}