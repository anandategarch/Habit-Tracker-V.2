import { VariantCanvas } from "../components/VariantCanvas";
type Props={view:"dashboard"|"finance";financeSection:"wallets"|"transfers"|"recurring"|"savings"|"rules"|"split"|"weekly"};
export function VariantE(props:Props){return <VariantCanvas variant="E" {...props}/>;}
