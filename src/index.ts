// import { runEmailProcessing } from "@/email-processing/run";

// try {
//   await runEmailProcessing();
// } catch (error) {
//   console.error("Email status updater failed", {
//     error: error instanceof Error ? error.message : String(error),
//   });

//   process.exitCode = 1;
// }

import { Agent, run, tool } from "@openai/agents"
import z from 'zod'

const historyFunFact = tool({
  name: 'history_fun_fact',
  description: 'Return a short history fun fact',
  parameters: z.object({}),
  async execute() {
    return "Sharks are older than trees"
  }
})

const historyTutor = new Agent({
  name: 'History Tutor',
  instructions: "Answer history questions clearly and concisely.",
})

const mathTutor = new Agent({
  name: "Math Agent",
  instructions: "Explain math step by step and include worked examples.",
})

const triageAgent = Agent.create({
  name: 'Homework triage',
  instructions: "Route each homework question to the right specialist.",
  handoffs: [historyTutor, mathTutor]
})

const result = await run(
  triageAgent, 
  "Who was the first president of the United States?"
)

console.log(result.finalOutput)
console.log(result.lastAgent?.name)
