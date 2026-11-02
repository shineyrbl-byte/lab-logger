import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import {C1StartButtonScenario} from "./C1StartButtonScenario"
import {C1StartButtonIKScenario} from "./C1StartButtonIKScenario"
import {C2RowMatchesDisplaysScenario} from "./C2RowMatchesDisplaysScenario"
import {C2DefaultIntervalScenario} from "./C2DefaultIntervalScenario"
import {C3TableScrollScenario} from "./C3TableScrollScenario"
import {C4StopShowsGraphScenario} from "./C4StopShowsGraphScenario"
import {C5GraphNavigationScenario} from "./C5GraphNavigationScenario"
import {C5GraphNavigationIKScenario} from "./C5GraphNavigationIKScenario"

@component
export class LeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex: ScenarioMetadata[] = [
    {id: "c1-start-button-pinch", typename: C1StartButtonScenario.getTypeName()},
    {id: "c1-start-button-ik", typename: C1StartButtonIKScenario.getTypeName()},
    {
      id: "c2-row-matches-displays",
      typename: C2RowMatchesDisplaysScenario.getTypeName(),
      parameters: {interval_sec: "2", rows: "5"},
    },
    {id: "c2-default-interval-10s", typename: C2DefaultIntervalScenario.getTypeName()},
    {id: "c3-table-newest-visible-and-scroll", typename: C3TableScrollScenario.getTypeName()},
    {id: "c4-stop-shows-first-graph", typename: C4StopShowsGraphScenario.getTypeName()},
    {id: "c5-graph-next-previous", typename: C5GraphNavigationScenario.getTypeName()},
    {id: "c5-graph-nav-ik", typename: C5GraphNavigationIKScenario.getTypeName()},
  ]
}
