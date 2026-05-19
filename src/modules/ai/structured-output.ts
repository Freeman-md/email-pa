import config from "@/config/env";
import { generateText, Output } from "ai";
import { z } from "zod";

export type StructuredOutputRequest<TSchema extends z.ZodType> = {
  schema: TSchema;
  system: string;
  prompt: string;
};

export async function generateStructuredOutput<TSchema extends z.ZodType>({
  schema,
  system,
  prompt,
}: StructuredOutputRequest<TSchema>): Promise<z.infer<TSchema>> {
  const { aiModel } = config();

  const result = await generateText({
    model: aiModel,
    system,
    prompt,
    output: Output.object({ schema }),
  });

  return result.output as z.infer<TSchema>;
}
