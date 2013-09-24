require(["../public/timer"], function(Timer) {

	describe("A timer", function() {

		var timer = new Timer();

		it("should have a default delay of 3000", function() {
			expect(timer.delay).toBe(3000);
		});
	});
});