<?php

namespace Challenge\ReportBundle\Service;

use Doctrine\ORM\EntityManager;

/**
 * Description of ReportService
 *
 * @author Flavio
 */
class ReportService {
    
    protected $em;

    public function __construct(EntityManager $em)
    {
        $this->em = $em;
    }
    
    // Public API
    public function getOrdersDateRange() {
        
        $dql = 'SELECT MIN(sol.creationDate) AS minDate, 
            MAX(sol.creationDate) AS maxDate 
            FROM ChallengeReportBundle:SalesOrderLine sol';
        $query = $this->em->createQuery($dql);
        $results = $query->getScalarResult()[0];
        
        return array(
            'minDate' => ($results['minDate'])?(strtotime($results['minDate']) * 1000):0, 
            'maxDate' => ($results['minDate'])?(strtotime($results['maxDate']) * 1000):(microtime(true) * 1000)
        );
    }
    
    public function doSearch($params) {
        
        $queryBuilder = $this->buildQueryConditions($params);
        $queryBuilder->select('COUNT (DISTINCT p.productId)');
        $totalItems = $queryBuilder->getQuery()->getSingleScalarResult();

        $queryBuilder->select('p.productId AS productId, 
            p.product AS product, 
            SUM(sol.quantity) AS unitsSold,  
            SUM(sol.totalCost) AS totalCost,
            SUM(sol.totalPrice) AS totalRevenue,
            SUM(sol.totalProfit) AS totalProfit')
                ->groupBy('sol.product')
                ->setFirstResult($params['offset'])
                ->setMaxResults($params['chunk']);
        $this->prepareOrderBy($queryBuilder, $params);

        $list = $queryBuilder->getQuery()->execute();
        
        return array('totalItems' => $totalItems, 'list' => $list);
    }
    
    
    // Private methods    
    private function getParam($params, $name, $default = null) {

        if (array_key_exists($name, $params)) {
            $value = trim($params[$name]);
            if (!empty($value)) {
                return $value;
            }
        }

        return $default;
    }
    
    public function buildQueryConditions($params) {
        
        $queryBuilder = $this->em->createQueryBuilder();

        $queryBuilder
                ->from('ChallengeReportBundle:SalesOrderLine', 'sol')
                ->innerJoin('sol.product', 'p');

        $country = $this->getParam($params, 'country');
        if (!empty($country)) {
            $queryBuilder
                    ->innerJoin('sol.salesOrder', 'so')
                    ->innerJoin('so.country', 'c')
                    ->andWhere('c.code = :country')
                    ->setParameter('country', $country);
        }

        $startDate = $this->getParam($params, 'startDate');
        if (!empty($startDate)) {
            $start = DateTime::createFromFormat($params['format'], $startDate);
            $start->setTime(0, 0, 0);
            $queryBuilder
                    ->andWhere('sol.creationDate >= :startDate')
                    ->setParameter('startDate', $start);
        }

        $endDate = $this->getParam($params, 'endDate');
        if (!empty($endDate)) {
            $end = DateTime::createFromFormat($params['format'], $endDate);
            $end->setTime(23, 59, 59);
            $queryBuilder
                    ->andWhere('sol.creationDate <= :endDate')
                    ->setParameter('endDate', $end);
        }

        $product = $this->getParam($params, 'product');
        if (!empty($product)) {
            $queryBuilder
                    ->andWhere('p.product LIKE :product')
                    ->setParameter('product', '%' . $product . '%');
        }

        return $queryBuilder;
    }

    public function prepareOrderBy($queryBuilder, $params) {

        $sort = $this->getParam($params, 'sort');
        $direction = $this->getParam($params, 'direction');
        if (!empty($sort)) {
            $queryBuilder->orderBy($sort, $direction);
        }
    }
    
}

?>
