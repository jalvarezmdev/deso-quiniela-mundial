# Match Prediction Points Design

## Goal

Show each user's earned points in the `Ver Resultados` modal on `/resultados`, including `+0 PTS`.

## Design

Extend `list_predictions_for_match` to load the selected match result alongside its predictions and compute each prediction's points with the existing server scoring helper. Add `points` to the existing response DTO and render `+{points} PTS` next to each user's predicted score.

The endpoint remains the source of truth, so the browser does not duplicate scoring rules. Existing loading, empty, and error states remain unchanged.

## Testing

Add a focused Edge Function action test that verifies zero and positive points, and extend the component test to verify both values render in the modal.
