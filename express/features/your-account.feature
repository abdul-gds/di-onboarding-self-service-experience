Feature:
  A page where users can view and change the details associated with their account.

  Background:
    Given the user has logged in and arrived on the your account page
    When they click on the link that points to "/change-phone-number"
    Then they should see the text "Change your mobile phone number"

    When they enter "0770 9000 124" into the text-field with the id "mobileNumber"
    And they click the Continue button
    Then they should see the text "We sent a code to: +447709000124"

  Scenario: The user successfully changes their phone number

    When they enter "123456" into the text-field with the id "sms-otp"
    And they click the Continue button
    Then they should see the text "You have changed your mobile phone number"
    #And they should see the text "+447709000124"

  Scenario: The user tries to change their phone number but enters an incorrect SMS code

    When they enter "666666" into the text-field with the id "sms-otp"
    And they click the Continue button
    Then they should see the text "The code you entered is not correct or has expired - enter it again or request a new code"

  Scenario: The user tries to change their phone number but needs a new SMS code



