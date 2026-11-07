# Lab Logger

**Demo video:** https://youtu.be/4U_Zpr5aqFk

A SPECS Lens for the Learn AR with SPECS hackathon (Devpost).

At a chemical engineering lab bench with five temperature sensor displays, press **Start** and the Lens logs a row every 10 seconds (T1–T5, plus voltage and current from two heaters) into an observation table floating just above the instruments. Press **Stop** and seven graphs appear in its place: five temperature-vs-time and two voltage/resistance-vs-time.

In the preview, a virtual lab bench with scripted heat-transfer sample data stands in for real instruments.

- Design brief: [`devpost/design-brief.md`](devpost/design-brief.md)
- Tests: 8 LEAF scenarios in `Assets/LeafTests/` cover all five done criteria from the brief (all pass in preview).
- Built with Lens Studio 5.23.2, Spectacles Interaction Kit and Spectacles UI Kit, using CLAD with Claude Code.

## Open it
Open `MyLens.esproj` in Lens Studio 5.23.2 or later, then use the Preview panel (Interactive Preview: click to pinch).
