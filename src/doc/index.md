Introduction
============

NGSI entities provided by the NGSI source operator cannot be injected directly
to map viewer widgets. This is due to the fact that map viewers expect data
coming through the endpoints to have an especific format.

This operator transforms those NGSI entities into Points of Interest suitable
for map viewer widgets. To be able to do so, those entities should contain an
attribute containing the coordinates of the entity or two attributes, one
providing the latitude and other one providing the longitude. Also, take into
account the fact this operator is generic, so marker bubbles of the PoIs created
by this operator will be a mere composition of the attribute/value pairs.

If your are a developer, an option for improving the information shown in the
associated point of interest bubbles is to download this operator an use it as
an skeleton for your improved version of the operator. **Remember to change the
id metadata** (vendor, name and version) before uploading it again.

Settings
========


