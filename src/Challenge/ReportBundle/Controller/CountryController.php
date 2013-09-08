<?php

namespace Challenge\ReportBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;

class CountryController extends Controller
{
    
    public function countryListAction($params = null) {
        
        $em = $this->getDoctrine()->getManager();
        $dql = "SELECT c FROM ChallengeReportBundle:Country c";
        $query = $em->createQuery($dql);
        
        $countries = $query->execute();
        
        return $this->render(
            'ChallengeReportBundle:Country:countrySelect.html.twig',
            array('countries' => $countries, 'params' => $params)
        );
    }
}
