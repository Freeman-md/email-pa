export type GraphEmail = {
  id: string;
  subject?: string;
  sender?: {
    emailAddress?: {
      name?: string;
      address?: string;
    };
  };
  receivedDateTime?: string;
  webLink?: string;
  bodyPreview?: string;
  body?: {
    contentType?: "text" | "html";
    content?: string;
  };
};

export type GraphEmailsResponse = {
  value: GraphEmail[];
  "@odata.nextLink"?: string;
};
