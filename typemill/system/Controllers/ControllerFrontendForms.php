<?php

namespace Typemill\Controllers;

use Typemill\Models\Validation;
use Typemill\Models\WriteYaml;

class ControllerFrontendForms extends ControllerShared
{

	public function savePublicForm($request, $response, $args)
	{ 
		if($request->isPost())
		{
			$params 			= $request->getParams();
			reset($params);
			$pluginName 		= key($params);
			$referer			= $request->getHeader('HTTP_REFERER');

			# check csrf protection
		    if($request->getattribute('csrf_result') === false )
		    {
				$this->c->flash->addMessage('error', 'The form has a timeout. Please try again.');
				return $response->withRedirect($referer[0]);
		    }
			
			if(isset($params[$pluginName]))
			{
				# validate the user-input
				$this->validateInput('plugins', $pluginName, $params[$pluginName]);
			}
			
			# check for errors and redirect to path, if errors found
			if(isset($_SESSION['errors']))
			{
				$this->c->flash->addMessage('error', 'Please correct the errors');
				return $response->withRedirect($referer[0]);
			}
			
			# clean up and make sure that only validated data are stored
			$data = [ $pluginName => $params[$pluginName]];
			
			# create write object
			$writeYaml = new WriteYaml();
			
			# write the form data into yaml file
			$writeYaml->updateYaml('settings', 'formdata.yaml', $data);
			
			# add message and return to original site
			$this->c->flash->addMessage('formdata', $pluginName);
			return $response->withRedirect($referer[0]);
		}
	}

	private function validateInput($objectType, $objectName, $userInput)
	{
		# get settings and start validation
		$originalSettings 	= \Typemill\Settings::getObjectSettings($objectType, $objectName);
		$userSettings 		= \Typemill\Settings::getUserSettings();
		$validate			= new Validation();

		if(isset($originalSettings['public']['fields']))
		{
			/* flaten the multi-dimensional array with fieldsets to a one-dimensional array */
			$originalFields = array();
			foreach($originalSettings['public']['fields'] as $fieldName => $fieldValue)
			{
				if(isset($fieldValue['fields']))
				{
					foreach($fieldValue['fields'] as $subFieldName => $subFieldValue)
					{
						$originalFields[$subFieldName] = $subFieldValue;
					}
				}
				else
				{
					$originalFields[$fieldName] = $fieldValue;
				}
			}

			/* take the user input data and iterate over all fields and values */
			foreach($userInput as $fieldName => $fieldValue)
			{
				/* get the corresponding field definition from original plugin settings */
				$fieldDefinition = isset($originalFields[$fieldName]) ? $originalFields[$fieldName] : false;

				if($fieldDefinition)
				{
					/* validate user input for this field */
					$validate->objectField($fieldName, $fieldValue, $objectName, $fieldDefinition);
				}
				if(!$fieldDefinition && $fieldName != 'active')
				{
					$_SESSION['errors'][$objectName][$fieldName] = array('This field is not defined!');
				}
			}
		}
	}
}