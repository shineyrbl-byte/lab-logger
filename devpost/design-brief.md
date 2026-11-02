---
status: approved
---

# Design brief: Lab Logger

## The one spatial moment
I'm standing at a chemical engineering lab bench with five temperature sensor displays in front of me. I press Start, and every 10 seconds a new row with all five temperatures, plus the voltage and current from two of the devices, appears in an observation table just above the displays. I don't write anything down. When I press Stop, the graphs I need appear next to the setup.

## Why it belongs on glasses
- Uses: draws in the world, leaves your body free
- Why it's better than the phone or laptop version: readings come every 10 seconds from five sensors, so there's no time to look down at a notebook or phone. The table sits right above the instruments, so my eyes stay on the setup and my hands stay free. Afterwards I don't have to type every reading into Excel to build the observation table and graphs.

## Product or overlay
- Type: overlay. It responds to real instruments on a lab bench.
- What the real version would sense: the values shown on the five temperature sensors and the voltage/current readings of two devices.
- Stand-in for the preview: a virtual lab bench with five sensor displays and two devices showing voltage/current. Their values change over time from scripted sample data (temperatures rising and settling as in a heat-transfer run). The Lens "reads" them by copying the current displayed values into the table every 10 seconds.

## Where things live
- Where the user is looking during the main task: straight ahead at the five sensor displays on the bench.
- Virtual lab bench: about 1 m in front of the user at start, at real bench height (about 90 cm) (default), about 150 cm wide (default).
- Five sensor displays: in a row on the bench, in front of the user, each showing its sensor name (T1–T5) and current temperature. Two of them, or two small devices beside them, also show voltage and current (default: T4 and T5's heaters).
- Observation table: at the top, just above the row of displays, around chest height, facing the user, about 60 cm wide (default). Columns: Time (s), T1–T5 (°C), V (V), I (A) for each of the two devices.
- Start/Stop button: one big button on the bench beside the displays, within easy reach (default: right side, about 8 cm across).
- Graphs panel: appears in the same spot as the table after Stop, about 60 x 40 cm (default), with big Previous and Next buttons below it.

## Hands and input
- Start/Stop: pinch the one big button. It reads "Start" before recording and "Stop" while recording.
- Logging: automatic every 10 seconds, no input needed.
- Table: scroll to see older rows (drag the table or a scroll bar); the newest row stays in view by default.
- Graphs: pinch big Previous and Next buttons to move through the seven graphs.
- Targets are big and highlight when aimed at.
- Voice: none.

## When things show
- Observation table: shows while recording; hides when Stop is pressed (default: the graphs replace it).
- Graphs: hidden while recording; show after Stop, one graph at a time, with a label like "Graph 3 of 7".
- The seven graphs: five temperature distribution graphs (one per sensor, temperature vs time) and two voltage/resistance distribution graphs for the two devices (default: plotted against time; resistance = V / I).
- If something needs attention out of view: none. Everything sits in front of the user.

## Done criteria
Each one can be checked in Lens Studio's preview.
1. Pressing Start begins recording, and the button changes to Stop.
2. While recording, a new row appears in the observation table every 10 seconds, with the time and all values (T1–T5, plus voltage and current for the two devices) matching what the sensor displays showed at that moment.
3. As the table grows, the newest row is always visible, and I can scroll back to see older rows.
4. Pressing Stop hides the table and shows the first graph, made from the recorded readings.
5. Pressing Next and Previous moves through all seven graphs (five temperature, two voltage/resistance).

## Out of scope
- Reading real instruments with the camera (scripted sample data stands in).
- Exporting to Excel or saving data between sessions.
- Capturing notes from a classroom board.
- Swipe gestures (pinch buttons only).
- Showing graphs while recording.

## Risks and open questions
- Real instrument reading needs camera vision on real displays, which only real glasses (and more work) could prove. "Feel unproven."
- A long run makes a tall table; scrolling with the mouse in the preview should be checked for comfort.
- Exact experiment details (which devices give voltage/current, the right axes for the voltage/resistance graphs) are approximated with sample data.

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Don't record, identify, or follow people.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Walk around it.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Stand where a user would and look at the task.
3. **Ask the three questions.**
   - Does it use what I'm looking at?
   - Does it put something in my space, where it belongs?
   - Does it free my hands or let me keep my eyes up?
   - Would it be just as good on a phone? If so, what would make it need the glasses?
4. **Check comfort.**
   - Everything I need is in view while I do the task. Nothing sits at the edges, behind me, or stuck to my face.
   - Every control is within reach of someone standing there.
   - Text reads easily from where I stand. No dark UI disappearing.
   - Things show when needed and get out of the way.
5. **Label what you know.** Write "logic proven" next to anything the tests and preview show working, and "feel unproven" next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: "Move the step card 15 cm lower and next to the pan. Make the Next button twice as big. Re-run the tests." If a fix takes under a minute, like nudging a panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources
