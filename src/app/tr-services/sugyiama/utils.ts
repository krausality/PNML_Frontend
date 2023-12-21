import { Node } from 'src/app/tr-interfaces/petri-net/node';
import { Arc } from 'src/app/tr-classes/petri-net/arc';

// updates nodeInputMap and nodeOutputMap in place
// assigns the pre/post nodes for each individual node
export function generateAdjacentNodeMaps(
    arcs: Arc[],
    nodeInputMap: Map<Node, Node[]>,
    nodeOutputMap: Map<Node, Node[]>,
) {
    nodeInputMap.clear();
    nodeOutputMap.clear();

    arcs.forEach((arc) => {
        if (nodeInputMap.get(arc.to)) {
            nodeInputMap.get(arc.to)?.push(arc.from);
        } else {
            nodeInputMap.set(arc.to, [arc.from]);
        }

        if (nodeOutputMap.get(arc.from)) {
            nodeOutputMap.get(arc.from)?.push(arc.to);
        } else {
            nodeOutputMap.set(arc.from, [arc.to]);
        }
    });
}
