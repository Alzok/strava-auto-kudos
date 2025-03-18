describe("UI Module Tests", () => {
  test("should call showLimitExceededAlert when handlePauseDueToErrors is invoked", () => {
    const spyAlert = jest.spyOn(UI, "showLimitExceededAlert").mockImplementation(() => {});
    UI.handlePauseDueToErrors();
    expect(spyAlert).toHaveBeenCalled();
    spyAlert.mockRestore();
  });
});
