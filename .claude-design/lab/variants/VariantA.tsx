import { VariantCanvas } from "../components/VariantCanvas";
type Props={view:"dashboard"|"finance";financeSection:"wallets"|"transfers"|"recurring"|"savings"|"rules"|"split"|"weekly"};
export function VariantA(props:Props){return <VariantCanvas variant="A" {...props}/>;}
