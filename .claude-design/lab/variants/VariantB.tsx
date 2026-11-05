import { VariantCanvas } from "../components/VariantCanvas";
type Props={view:"dashboard"|"finance";financeSection:"wallets"|"transfers"|"recurring"|"savings"|"rules"|"split"|"weekly"};
export function VariantB(props:Props){return <VariantCanvas variant="B" {...props}/>;}
