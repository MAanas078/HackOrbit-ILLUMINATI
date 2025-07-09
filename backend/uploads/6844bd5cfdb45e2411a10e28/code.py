import numpy as np
from sklearn.linear_model import LinearRegression

# Sample data
X = np.array([1, 2, 3, 4, 5]).reshape(-1, 1)  # Independent variable
y = np.array([2, 4, 5, 4, 5])                # Dependent variable

# Create and train the linear regression model
model = LinearRegression()
model.fit(X, y)

# Print the model parameters
print("Intercept:", model.intercept_)
print("Slope (coefficient):", model.coef_[0])

# Predict values
X_test = np.array([6, 7, 8]).reshape(-1, 1)
predictions = model.predict(X_test)

# Show predictions
for i, x in enumerate(X_test.flatten()):
    print(f"Prediction for x = {x}: y = {predictions[i]:.2f}")
