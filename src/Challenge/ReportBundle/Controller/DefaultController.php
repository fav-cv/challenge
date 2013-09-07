<?php

namespace Challenge\ReportBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\Template;

use Symfony\Component\HttpFoundation\Response;

class DefaultController extends Controller {

    /**
     * @Route("/hello/{name}")
     * @Template()
     */
    public function helloAction($name) {
        return array('name' => $name);
    }

    /**
     * @Route("/countries")
     * @Template()
     */
    public function countriesAction() {

        $countries = $this->getDoctrine()->getManager()
                ->getRepository('ChallengeReportBundle:Country')
                ->findAll();
        
        $content = '';        
        foreach ($countries as $country) {
            $content .= $country->getCountryId() . 
                    ' | ' . $country->getCode() . 
                    ' | ' . $country->getCountry() . "\n";
        }
        
        $response = new Response();
        $response->setContent($content);
        $response->headers->set('Content-Type', 'text/plain');
        
        return $response;
    }

}
