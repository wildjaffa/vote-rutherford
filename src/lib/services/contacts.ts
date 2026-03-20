import prisma, { withUserContext } from "../prisma";
import type { Contact } from "../../generated/prisma/client";
import { upsertContactSchema } from "../models/upsertContact";
import type { UpsertContactType } from "../models/upsertContact";
import { makeError } from "./utils";

export async function validateContactPayload(
  body: unknown,
): Promise<UpsertContactType> {
  const validation = upsertContactSchema.safeParse(body);
  if (!validation.success) {
    throw makeError("Validation failed", undefined, validation.error);
  }
  return validation.data;
}

export async function createContact(
  data: UpsertContactType,
  userId: string,
): Promise<Contact> {
  const validated = await validateContactPayload(data);

  return await withUserContext(userId, async () => {
    return prisma.contact.create({
      data: validated,
    });
  });
}

export async function updateContact(
  id: string,
  body: UpsertContactType,
  userId: string,
): Promise<Contact> {
  const existingContact = await prisma.contact.findUnique({
    where: { id },
  });
  if (!existingContact) {
    throw makeError("Contact not found", 404);
  }

  const validated = await validateContactPayload(body);

  return await withUserContext(userId, async () => {
    return prisma.contact.update({
      where: { id },
      data: {
        ...validated,
        updatedAt: new Date(),
      },
    });
  });
}

export async function deleteContact(
  id: string,
  userId: string,
): Promise<Contact> {
  const existingContact = await prisma.contact.findUnique({
    where: { id },
  });
  if (!existingContact) {
    throw makeError("Contact not found", 404);
  }

  return await withUserContext(userId, () =>
    prisma.contact.update({
      where: { id },
      data: { deletedAt: new Date() },
    }),
  );
}
