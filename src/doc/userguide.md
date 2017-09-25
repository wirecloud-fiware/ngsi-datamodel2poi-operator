## Introduction

NGSI entities provided by the NGSI source operator cannot be injected directly
to map viewer widgets. This is due to the fact that map viewers expect data
coming through the endpoints to have an especific format.

This operator transforms those NGSI entities into Points of Interest suitable
for map viewer widgets.

## Settings

This operator has no settings.

## Wiring

### Input endpoints

- `Entities`: Received entities will be transform into PoIs.

### Output endpoints

- `PoIs`: Transformed Points of Interests from the received entities

## Usage

In order to use this operator, plug a source of NGSI entities to the operator input, and connect the output to a map viewer widget (like the )