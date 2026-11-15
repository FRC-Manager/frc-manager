// FRC Manager: team disputes, the arguments a team has with itself during the season
(function () {
  'use strict';
  const D = G.Data;

  // (3.5) In season the team falls out with itself once or twice (n), in weeks drawn when the build starts: with two,
  // one in the build weeks and one in the competition weeks. Nothing else moves them: not morale, not fatigue, not a
  // shop incident the same week. Every dispute is a decision (C.resolveDispute): leave it for a small sure loss, or
  // step in and take a chance, sometimes pay to make it go away. A development penalty lasts the week, like a shop
  // incident's. The result is shown as soon as the choice is made.
  //   fx: morale, fatigue, support (Program Support), rep, sat (every sponsor's satisfaction),
  //       mods { fab, soft, research } (this week's development), skill [[drive team role, attribute, change]]
  //   {driver} {operator} {coach} {tech}: the drive team; {mentor}: one of the mentors; {a} {b} {c}: three students
  D.DISPUTE = { n: [1, 2] };
  const ALL = m => ({ fab: m, soft: m, research: m });
  D.DISPUTES = [
    { id: 'driver_coach', w: 3, title: 'The driver and the drive coach are not speaking',
      body: '{driver} and {coach} fell out over one call in the last practice run. The headset has been very quiet since.',
      opts: [
        { label: 'Let them sort it out', desc: 'Driving −2 for the driver, morale −3', fx: { skill: [['driver', 'drive', -2]], morale: -3 },
          text: 'By Thursday they were speaking again, one word at a time. The driving has not caught up yet.' },
        { label: 'Sit them down together', desc: '50%: no loss. 50%: it gets worse (driving −3 and composure −2 for the driver, morale −5)',
          risk: { p: 0.5, good: { text: 'An hour in the meeting room, and they came out with a new hand signal for "go around". Nobody else knows what it means, which seems to be the point.' },
            bad: { fx: { skill: [['driver', 'drive', -3], ['driver', 'comp', -2]], morale: -5 }, text: 'The meeting turned into a debate about who started it, with video evidence. Both left through different doors.' } } }
      ] },
    { id: 'design_build', w: 3, title: 'The design team and the build crew blame each other',
      body: 'A bracket came off the machine three millimetres short. {a} says the drawing was right. {b} says the drawing was wrong. The bracket has no opinion.',
      opts: [
        { label: 'Let it blow over', desc: 'Fabrication −15% this week, morale −2', fx: { mods: { fab: 0.85 }, morale: -2 },
          text: 'The bracket was remade twice, by two people who would not look at each other\'s screens.' },
        { label: 'Call a joint review of the drawings', desc: '50%: no loss. 50%: it gets worse (Fabrication −30% this week, morale −4)',
          risk: { p: 0.5, good: { text: 'It took ten minutes: one drawing was in inches. {a} and {b} now check units together, out loud, like a ritual.' },
            bad: { fx: { mods: { fab: 0.7 }, morale: -4 }, text: 'The review ran for two evenings and found three more parts that do not fit. Everybody was right about something, which helped nobody.' } } },
        { label: 'Buy pizza and have them remake it together', cost: 120, desc: 'Fabrication −5% this week', fx: { mods: { fab: 0.95 } },
          text: 'They remade the bracket side by side over two large pizzas. It fits, and so, for now, do they.' }
      ] },
    { id: 'robot_time', w: 3, title: 'Everybody needs the robot at once',
      body: 'The programmers need the robot for autonomous tuning. The mechanics have it in pieces on the bench. {a} has started a list of who had it last, with timestamps.',
      opts: [
        { label: 'First come, first served', desc: 'Software −25% this week, morale −2', fx: { mods: { soft: 0.75 }, morale: -2 },
          text: 'The mechanics got there first every day. The programmers tested their code on a chair.' },
        { label: 'Write a timetable for the robot', desc: '50%: no loss. 50%: it gets worse (Software −20% and Fabrication −20% this week, fatigue +3)',
          risk: { p: 0.5, good: { text: 'Two-hour blocks, a kitchen timer and a rule that the robot is handed over assembled. It worked, to everyone\'s surprise.' },
            bad: { fx: { mods: { soft: 0.8, fab: 0.8 }, fatigue: 3 }, text: 'The timetable put the programmers on the robot from nine to eleven at night. Both sides now agree on one thing, and it is the timetable.' } } }
      ] },
    { id: 'seniors_rookies', w: 2, title: 'The seniors will not let the new members touch anything',
      body: '{a} has been "watching and learning" for three weeks and would like to hold a tool. {b}, a senior, says there is no time to teach during the season.',
      opts: [
        { label: 'Leave it until the offseason', desc: 'Morale −4', fx: { morale: -4 },
          text: 'The new members swept the floor again. Two of them have started bringing homework to the shop.' },
        { label: 'Pair every senior with a new member', desc: '50%: no loss. 50%: it gets worse (Fabrication −20% this week, morale −2)',
          risk: { p: 0.5, good: { text: '{a} cut, deburred and fitted a whole gusset under {b}\'s eye. {b} admitted, quietly, that it was faster than doing it alone.' },
            bad: { fx: { mods: { fab: 0.8 }, morale: -2 }, text: 'Every tube cut this week is ten millimetres short. {b} has not said "I told you so". Yet.' } } }
      ] },
    { id: 'two_captains', w: 2, title: 'Two students both think they are the captain',
      body: '{a} ran Monday\'s meeting. {b} ran Tuesday\'s, and overturned everything Monday\'s decided. The whiteboard has been wiped four times.',
      opts: [
        { label: 'Wait and see who gives way', desc: 'Morale −3, fatigue +2', fx: { morale: -3, fatigue: 2 },
          text: 'Neither did. The team now holds every meeting twice.' },
        { label: 'Hold a vote', desc: '50%: no loss. 50%: it gets worse (all development −10% this week, morale −6)',
          risk: { p: 0.5, good: { text: 'The vote was close, and the loser asked to run the pit instead. It may be the best trade the team makes all season.' },
            bad: { fx: { mods: ALL(0.9), morale: -6 }, text: 'The vote was close, the count was disputed, and the losing side stayed away for most of the week.' } } }
      ] },
    { id: 'late_nights', w: 2, title: 'A parent has complained about the late nights',
      body: 'An email reached the principal about build sessions that end after ten. It was copied to you, to the school board and, for reasons nobody can explain, to the canteen.',
      opts: [
        { label: 'Carry on as before', desc: 'Program Support −2, morale −1', fx: { support: -2, morale: -1 },
          text: 'The principal walked past the shop at half past ten, twice, without coming in. That was the message.' },
        { label: 'Invite the parents to a build night', desc: '50%: no loss. 50%: it gets worse (the school sets a curfew: all development −15% this week)',
          risk: { p: 0.5, good: { text: 'Nine parents came. Four stayed until eleven, and one of them now runs the snack rota.' },
            bad: { fx: { mods: ALL(0.85) }, text: 'The parents came, saw a student asleep on a bumper, and went back to the principal. Lights out at nine this week.' } } },
        { label: 'Send everybody home at eight this week', desc: 'All development −12% this week, fatigue −3', fx: { mods: ALL(0.88), fatigue: -3 },
          text: 'Everybody was home for dinner for five days running. Several families were confused, and nobody complained.' }
      ] },
    { id: 'mentor_redo', w: 2, req: S => S.mentors.length > 0, title: 'A mentor rebuilt the students\' work overnight',
      body: '{mentor} stayed late and rebuilt the mechanism the students had spent a week on. It is better. Nobody is happy about it, least of all {a}, who built the first one.',
      opts: [
        { label: 'Say nothing', desc: 'Morale −5', fx: { morale: -5 },
          text: 'The new mechanism works well. {a} has not touched it, and has started calling it "the mentor\'s one".' },
        { label: 'Talk to the mentor', desc: '50%: no loss. 50%: it gets worse (the mentor stays away this week: Fabrication −20%, morale −3)',
          risk: { p: 0.5, good: { text: '{mentor} apologised to the whole team and spent the next evening holding the torch while {a} rebuilt it a third time, properly.' },
            bad: { fx: { mods: { fab: 0.8 }, morale: -3 }, text: '{mentor} took it badly and took the week off. The shop is quieter, and slower.' } } }
      ] },
    { id: 'playlist', w: 2, title: 'The shop playlist war',
      body: 'The mechanics want it loud. The programmers want silence. Somebody unplugged the speaker, and somebody else has hidden the cable.',
      opts: [
        { label: 'Stay out of it', desc: 'Software −10% this week, morale −2', fx: { mods: { soft: 0.9 }, morale: -2 },
          text: 'The speaker came back louder. Two programmers now work in the corridor, in coats.' },
        { label: 'Set a rota for the music', desc: '50%: no loss. 50%: it gets worse (Fabrication −10% and Software −10% this week, morale −3)',
          risk: { p: 0.5, good: { text: 'Odd days loud, even days quiet, and Friday is {a}\'s choice. Nobody likes {a}\'s choice, which has united the team.' },
            bad: { fx: { mods: { fab: 0.9, soft: 0.9 }, morale: -3 }, text: 'The rota is now the argument. There is a second rota, for who writes the rota.' } } },
        { label: 'Buy the programmers headphones', cost: 200, desc: 'No loss', text: 'Six pairs of headphones, and peace. The mechanics have turned it up to celebrate.' }
      ] },
    { id: 'outreach_hands', w: 2, title: 'The outreach team wants hands and the build team will not spare any',
      body: '{a} has promised a school visit this week and needs four people. {b} says nobody leaves the shop until the robot drives.',
      opts: [
        { label: 'The robot comes first', desc: 'Reputation −1, morale −2', fx: { rep: -1, morale: -2 },
          text: '{a} did the visit alone, with a poster and last year\'s gearbox. The school was polite about it.' },
        { label: 'Split the evenings between them', desc: '50%: no loss. 50%: it gets worse (Fabrication −15% this week, fatigue +3)',
          risk: { p: 0.5, good: { text: 'Four builders went, and came back with eleven sign-ups and a new respect for anyone who can hold a room of nine-year-olds.' },
            bad: { fx: { mods: { fab: 0.85 }, fatigue: 3 }, text: 'The visit ran long, the bus was late, and the four who went worked until midnight to catch up.' } } }
      ] },
    { id: 'operator_driver', w: 2, title: 'The operator wants to drive',
      body: '{operator} has posted practice times on the wall next to {driver}\'s. They are close. The drive team has stopped eating lunch together.',
      opts: [
        { label: 'Keep the line-up as it is', desc: 'Composure −2 for the operator, morale −2', fx: { skill: [['operator', 'comp', -2]], morale: -2 },
          text: '{operator} took the times down from the wall. They are still on the back of the clipboard.' },
        { label: 'Hold a drive-off', desc: '50%: no loss. 50%: it gets worse (composure −3 for the driver and the operator, fatigue +3)',
          risk: { p: 0.5, good: { text: 'Ten runs each, timed by {coach}. {driver} won by four tenths, and {operator} shook hands and asked for the same again next month.' },
            bad: { fx: { skill: [['driver', 'comp', -3], ['operator', 'comp', -3]], fatigue: 3 }, text: 'Ten runs each became thirty. The times got worse, and so did the mood. Nobody remembers who won.' } } }
      ] },
    { id: 'strategy_row', w: 3, req: S => S.phase === 'comp', title: 'The scouts and the drive team disagree about strategy',
      body: 'The scouts have forty pages of data that say play defence. {driver} has one sentence: "We did not build a robot to stand in the way."',
      opts: [
        { label: 'Leave it to the drive team', desc: 'Strategy −2 for the drive coach, morale −2', fx: { skill: [['coach', 'strat', -2]], morale: -2 },
          text: 'The forty pages stayed in the bag. The scouts have stopped offering them.' },
        { label: 'Lock them in a room until they agree', desc: '50%: no loss. 50%: it gets worse (composure −2 for the driver and the operator, morale −4)',
          risk: { p: 0.5, good: { text: 'They came out with a one-page plan and a rule: data before the match, instinct during it. Both sides claim to have won.' },
            bad: { fx: { skill: [['driver', 'comp', -2], ['operator', 'comp', -2]], morale: -4 }, text: 'Two hours later the only agreement was that the room was too small. The drive team is now second-guessing every call.' } } }
      ] },
    { id: 'pit_roles', w: 2, req: S => S.phase === 'comp', title: 'The pit crew is arguing about who does what',
      body: 'Three people reached for the same battery after the last practice match, and nobody checked the bumpers. {tech} says a checklist would fix it. Everybody else says {tech} always says that.',
      opts: [
        { label: 'They will work it out', desc: 'Fatigue +4, morale −2', fx: { fatigue: 4, morale: -2 },
          text: 'Everything in the pit is now done twice, by different people, in a hurry.' },
        { label: 'Write the checklist and assign every job', desc: '50%: no loss. 50%: it gets worse (fatigue +6, morale −3)',
          risk: { p: 0.5, good: { text: 'One laminated page, six names, twelve boxes to tick. The pit has not been this quiet since the robot was a drawing.' },
            bad: { fx: { fatigue: 6, morale: -3 }, text: 'The checklist has forty-one items and took three evenings to agree. Job number one is "do not argue about the checklist".' } } }
      ] },
    { id: 'sponsor_shirts', w: 1, req: S => S.sponsors.length > 0, title: 'An argument about the team shirts',
      body: 'Half the team wants a new shirt design. The other half points out that the old one has every sponsor\'s logo where the contract says it must be. {a} has made a mock-up with the logos "smaller, but classier".',
      opts: [
        { label: 'Let them wear what they like', desc: 'Sponsor satisfaction −4, morale −1', fx: { sat: -4, morale: -1 },
          text: 'Two shirt designs turned up at the next event. A sponsor noticed which one had its logo on the sleeve.' },
        { label: 'Put it to a design contest', desc: '50%: no loss. 50%: it gets worse (morale −5, fatigue +2)',
          risk: { p: 0.5, good: { text: 'The winning design kept every logo and moved the robot to the back. Even {a} voted for it.' },
            bad: { fx: { morale: -5, fatigue: 2 }, text: 'Fourteen entries, three recounts and one accusation of ballot stuffing. The old shirt stays, and nobody is speaking to {a}.' } } },
        { label: 'Order the old design again and close the subject', cost: 150, desc: 'Morale −1', fx: { morale: -1 },
          text: 'A box of the old shirts arrived on Wednesday. The subject is closed, and {a} is wearing the mock-up under a jacket.' }
      ] }
  ];
})();
