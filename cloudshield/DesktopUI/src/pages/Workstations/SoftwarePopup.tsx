import { Software } from "../../models/Workstations";
export default function SoftwarePopup({ softwares: software }: { softwares: Software[] }){
return(
    <div className="software-popup">
        <h2>Installed Software</h2>
        <ul>
            {software.map((item, index) => (
                <li key={index}>
                    <strong>{item.name}</strong>: {item.description}
                </li>
            ))}
        </ul>
    </div>
)
}