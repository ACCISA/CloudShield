import EditIcon from "../assets/EditIcon";
import TrashIcon from "../assets/TrashIcon";

export const WORKSTATION_EDIT_MENU = [
  {
    icon: <EditIcon width={15} height={16} color="#fff" />,
    label: "edit workstation",
    color: "#fff",
    onClick: null, // Will be set when used
  },
  {
    icon: <TrashIcon width={12} height={14} color="#D51616" />,
    label: "delete workstation",
    color: "#D51616",
    onClick: null, // Will be set when used
  },
];

export const USER_EDIT_MENU = [
  {
    icon: <EditIcon width={15} height={16} color="#fff" />,
    label: "edit user",
    color: "#fff",
    onClick: null,
  },
  {
    icon: <TrashIcon width={12} height={14} color="#D51616" />,
    label: "delete user",
    color: "#D51616",
    onClick: null,
  },
];

export const GROUP_EDIT_MENU = [
  {
    icon: <EditIcon width={15} height={16} color="#fff" />,
    label: "edit group",
    color: "#fff",
    onClick: null,
  },
  {
    icon: <TrashIcon width={12} height={14} color="#D51616" />,
    label: "delete group",
    color: "#D51616",
    onClick: null,
  },
];

export const FILE_EDIT_MENU = [
  {
    icon: <EditIcon width={15} height={16} color="#fff" />,
    label: "edit file",
    color: "#fff",
    onClick: null,
  },
  {
    icon: <TrashIcon width={12} height={14} color="#D51616" />,
    label: "delete file",
    color: "#D51616",
    onClick: null,
  },
];
