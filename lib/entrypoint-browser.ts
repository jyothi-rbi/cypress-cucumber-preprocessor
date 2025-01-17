import { AttachmentContentEncoding, Pickle } from "@cucumber/messages";

import parse from "@cucumber/tag-expressions";

import { fromByteArray } from "base64-js";

import { createError } from "./helpers/error";

import { collectTagNames } from "./helpers/ast";

import { INTERNAL_SPEC_PROPERTIES } from "./constants";

import {
  ITaskCreateStringAttachment,
  TASK_CREATE_STRING_ATTACHMENT,
} from "./cypress-task-definitions";

import { retrieveInternalSpecProperties } from "./browser-runtime";

import { runStepWithLogGroup } from "./helpers/cypress";

import DataTable from "./data_table";

import { getRegistry } from "./registry";

import {
  IHookBody,
  IParameterTypeDefinition,
  IStepDefinitionBody,
} from "./public-member-types";

function defineStep<T extends unknown[], C extends Mocha.Context>(
  description: string | RegExp,
  implementation: IStepDefinitionBody<T, C>
) {
  getRegistry().defineStep(description, implementation);
}

function runStepDefininition(
  world: Mocha.Context,
  text: string,
  argument?: DataTable | string
) {
  runStepWithLogGroup({
    keyword: "Step",
    text,
    fn: () => getRegistry().runStepDefininition(world, text, argument),
  });
}

function defineParameterType<T, C extends Mocha.Context>(
  options: IParameterTypeDefinition<T, C>
) {
  getRegistry().defineParameterType(options);
}

function defineBefore(options: { tags?: string }, fn: IHookBody): void;
function defineBefore(fn: IHookBody): void;
function defineBefore(
  optionsOrFn: IHookBody | { tags?: string },
  maybeFn?: IHookBody
) {
  if (typeof optionsOrFn === "function") {
    getRegistry().defineBefore({}, optionsOrFn);
  } else if (typeof optionsOrFn === "object" && typeof maybeFn === "function") {
    getRegistry().defineBefore(optionsOrFn, maybeFn);
  } else {
    throw new Error("Unexpected argument for Before hook");
  }
}

function defineAfter(options: { tags?: string }, fn: IHookBody): void;
function defineAfter(fn: IHookBody): void;
function defineAfter(
  optionsOrFn: IHookBody | { tags?: string },
  maybeFn?: IHookBody
) {
  if (typeof optionsOrFn === "function") {
    getRegistry().defineAfter({}, optionsOrFn);
  } else if (typeof optionsOrFn === "object" && typeof maybeFn === "function") {
    getRegistry().defineAfter(optionsOrFn, maybeFn);
  } else {
    throw new Error("Unexpected argument for After hook");
  }
}

function createStringAttachment(
  data: string,
  mediaType: string,
  encoding: AttachmentContentEncoding
) {
  const taskData: ITaskCreateStringAttachment = {
    data,
    mediaType,
    encoding,
  };

  cy.task(TASK_CREATE_STRING_ATTACHMENT, taskData);
}

export function attach(data: string | ArrayBuffer, mediaType?: string) {
  if (typeof data === "string") {
    mediaType = mediaType ?? "text/plain";

    if (mediaType.startsWith("base64:")) {
      createStringAttachment(
        data,
        mediaType.replace("base64:", ""),
        AttachmentContentEncoding.BASE64
      );
    } else {
      createStringAttachment(
        data,
        mediaType ?? "text/plain",
        AttachmentContentEncoding.IDENTITY
      );
    }
  } else if (data instanceof ArrayBuffer) {
    if (typeof mediaType !== "string") {
      throw Error("ArrayBuffer attachments must specify a media type");
    }

    createStringAttachment(
      fromByteArray(new Uint8Array(data)),
      mediaType,
      AttachmentContentEncoding.BASE64
    );
  } else {
    throw Error("Invalid attachment data: must be a ArrayBuffer or string");
  }
}

function isFeature() {
  return Cypress.env(INTERNAL_SPEC_PROPERTIES) != null;
}

export const NOT_FEATURE_ERROR =
  "Expected to find internal properties, but didn't. This is likely because you're calling doesFeatureMatch() in a non-feature spec. Use doesFeatureMatch() in combination with isFeature() if you have both feature and non-feature specs";

function doesFeatureMatch(expression: string) {
  let pickle: Pickle;

  try {
    pickle = retrieveInternalSpecProperties().pickle;
  } catch {
    throw createError(NOT_FEATURE_ERROR);
  }

  return parse(expression).evaluate(collectTagNames(pickle.tags));
}

export {
  DataTable,
  isFeature,
  doesFeatureMatch,
  defineStep as Given,
  defineStep as When,
  defineStep as Then,
  defineStep,
  runStepDefininition as Step,
  defineParameterType,
  defineBefore as Before,
  defineAfter as After,
};
